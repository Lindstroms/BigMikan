// GitHub Pages serves this project from https://lindstroms.github.io/BigMikan/,
// a sub-path rather than the domain root, so the built assets need that
// prefix. It's only applied when the GitHub Actions workflow sets
// GITHUB_PAGES=true, so local `npm run dev` / `npm run build` are unaffected.
const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";
const repoName = "BigMikan";

const basePath = isGithubPagesBuild ? `/${repoName}` : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: isGithubPagesBuild ? `/${repoName}/` : "",
  // Exposed to client code so plain `public/` asset URLs (e.g. CSS
  // background-image) can be prefixed correctly - next/link and next/image
  // handle basePath automatically, but a manual url() reference doesn't.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
