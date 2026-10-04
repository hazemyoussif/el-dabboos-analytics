export function changedArtifactDiagnostics(files) {
  return files.filter(file => !/(?:^|\/)\.env\.example$/.test(file) && /(?:^|\/)(?:\.env(?:\..*)?|.*\.(?:pem|key))$/.test(file)).map(file => `Forbidden sensitive artifact: ${file}`);
}
