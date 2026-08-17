export function assetUrl(image: string, projectPath: string, version = 0): string {
  const path = image.split('/').map(encodeURIComponent).join('/')
  return `opengms://asset/${path}?project=${encodeURIComponent(projectPath)}&v=${version}`
}
