// Commit messages follow Conventional Commits: "feat(vietqr): add card presets", "fix: ...".
// `npm run commit` asks for each part (commitizen); the commit-msg hook checks hand-written messages.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allow Co-Authored-By and other trailers, and long URLs in the body.
    "body-max-line-length": [0],
    "footer-max-line-length": [0]
  }
};
