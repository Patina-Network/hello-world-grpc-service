export async function getShortSha(sha: string) {
  const shortSha = sha.slice(0, 8).toString().trim();

  if (shortSha.length !== 8) {
    throw new Error("Could not parse git SHA");
  }

  return shortSha;
}
