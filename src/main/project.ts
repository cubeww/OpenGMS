import { basename } from 'node:path'
import type { Project } from '../shared/types'
import { gmxLoader, type ProjectLoader } from './gmx'

const loaders: ProjectLoader[] = [gmxLoader]

export async function loadProject(file: string): Promise<Project> {
  const loader = loaders.find((item) => item.canLoad(file))
  if (!loader) throw new Error(`Unsupported project format: ${basename(file)}`)
  return loader.load(file)
}
