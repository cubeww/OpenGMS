import { spawn, type ChildProcess } from 'node:child_process'
import { copyFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { Readable } from 'node:stream'
import type { BuildMode, BuildOutput, BuildState, Project } from '../shared/types'
import { getCompiler } from './compiler'

type BuildProject = Pick<Project, 'folder' | 'name' | 'path'>

type BuildEvents = {
  state: (state: BuildState) => void
  output: (output: BuildOutput) => void
}

type BuildJob = {
  mode: BuildMode
  child: ChildProcess | null
  stopped: boolean
  running: boolean
  done: Promise<void> | null
}

type ProcessExit = {
  code: number | null
  signal: NodeJS.Signals | null
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown build error'
}

function readLines(stream: Readable, send: (text: string) => void): void {
  stream.setEncoding('utf8')
  let pending = ''

  stream.on('data', (chunk: string) => {
    pending += chunk
    const lines = pending.split(/\r?\n/)
    pending = lines.pop() ?? ''
    lines.forEach(send)
  })
  stream.on('end', () => {
    if (pending) send(pending)
  })
}

async function killProcess(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null) return

  if (process.platform !== 'win32') {
    child.kill('SIGTERM')
    return
  }

  await new Promise<void>((resolve) => {
    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      resolve()
    }
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore'
    })
    killer.once('error', () => {
      child.kill()
      finish()
    })
    killer.once('close', finish)
  })
}

export class BuildService {
  private current: BuildJob | null = null
  private value: BuildState = { phase: 'idle', mode: null }

  constructor(private readonly events: BuildEvents) {}

  get state(): BuildState {
    return { ...this.value }
  }

  get busy(): boolean {
    return this.current !== null
  }

  start(mode: BuildMode, project: BuildProject, config: string): BuildState {
    if (this.current) throw new Error('A build or game is already running')

    const job: BuildJob = {
      mode,
      child: null,
      stopped: false,
      running: false,
      done: null
    }
    this.current = job
    this.setState({ phase: mode === 'clean' ? 'cleaning' : 'building', mode })
    job.done = this.work(job, project, config)
    return this.state
  }

  async stop(): Promise<BuildState> {
    const job = this.current
    if (!job) return this.state

    if (!job.stopped) {
      job.stopped = true
      this.setState({ phase: 'stopping', mode: job.mode })
      if (job.child) await killProcess(job.child)
    }
    if (job.done) await job.done
    return this.state
  }

  private async work(job: BuildJob, project: BuildProject, config: string): Promise<void> {
    const buildFolder = join(project.folder, 'build')
    const dataFile = join(buildFolder, 'data.win')

    try {
      this.write(
        'system',
        job.mode === 'clean'
          ? `Cleaning ${project.name}...`
          : `Building ${project.name} (${config})...`
      )
      const compiler = await getCompiler()
      if (job.stopped) return

      if (job.mode === 'clean') {
        const cleaned = await this.runProcess(job, compiler.file, ['clean'], project.folder)
        if (job.stopped) return
        if (cleaned.code !== 0) {
          this.write('stderr', `Clean failed with exit code ${cleaned.code ?? cleaned.signal ?? 'unknown'}.`)
          return
        }
        this.write('system', 'Clean completed.')
        return
      }

      await mkdir(buildFolder, { recursive: true })
      if (job.stopped) return

      const built = await this.runProcess(
        job,
        compiler.file,
        ['build', project.path, dataFile, config],
        project.folder
      )
      if (job.stopped) return
      if (built.code !== 0) {
        this.write('stderr', `Build failed with exit code ${built.code ?? built.signal ?? 'unknown'}.`)
        return
      }

      await copyFile(compiler.runtimeDll, join(buildFolder, 'd3dx9_43.dll'))
      if (job.mode === 'build') {
        this.write('system', `Build completed: ${dataFile}`)
        return
      }

      const runner = join(buildFolder, `${project.name}.exe`)
      const runnerInfo = await stat(runner)
      if (!runnerInfo.isFile()) throw new Error(`Built game executable is missing: ${runner}`)
      if (job.stopped) return

      job.running = true
      this.setState({ phase: 'running', mode: job.mode })
      this.write('system', `Running ${runner}`)
      const finished = await this.runProcess(job, runner, [], buildFolder)
      if (job.stopped) return

      if (finished.code === 0) this.write('system', 'Game exited normally.')
      else this.write('stderr', `Game exited with code ${finished.code ?? finished.signal ?? 'unknown'}.`)
    } catch (error) {
      if (!job.stopped) this.write('stderr', errorText(error))
    } finally {
      if (this.current !== job) return
      if (job.stopped) {
        this.write(
          'system',
          job.running ? 'Game stopped.' : job.mode === 'clean' ? 'Clean stopped.' : 'Build stopped.'
        )
      }
      this.current = null
      this.setState({ phase: 'idle', mode: null })
    }
  }

  private async runProcess(
    job: BuildJob,
    file: string,
    args: string[],
    cwd: string
  ): Promise<ProcessExit> {
    if (job.stopped) return { code: null, signal: null }

    const child = spawn(file, args, {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    job.child = child
    if (child.stdout) readLines(child.stdout, (text) => this.write('stdout', text))
    if (child.stderr) readLines(child.stderr, (text) => this.write('stderr', text))

    try {
      return await new Promise<ProcessExit>((resolve, reject) => {
        child.once('error', reject)
        child.once('close', (code, signal) => resolve({ code, signal }))
      })
    } finally {
      if (job.child === child) job.child = null
    }
  }

  private setState(state: BuildState): void {
    this.value = state
    this.events.state(this.state)
  }

  private write(stream: BuildOutput['stream'], text: string): void {
    if (!text) return
    this.events.output({ stream, text })
  }
}
