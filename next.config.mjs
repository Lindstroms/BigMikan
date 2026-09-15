// GitHub Pages serves this project from https://lindstroms.github.io/BigMikan/,
// a sub-path rather than the domain root, so the built assets need that
// prefix. It's only applied when the GitHub Actions workflow sets
// GITHUB_PAGES=true, so local `npm run dev` / `npm run build` are unaffected.
const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";
const repoName = "BigMikan";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: isGithubPagesBuild ? `/${repoName}` : "",
  assetPrefix: isGithubPagesBuild ? `/${repoName}/` : "",
};

export default nextConfig;
