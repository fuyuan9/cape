# Security & Supply Chain Protection

Cape Framework includes the following npm supply chain attack countermeasures and security scanning mechanisms by default to ensure user safety.

---

## Security Measures in Place

### 1. Disabling Third-Party `postinstall` Scripts by Default (`.npmrc`)

To prevent malicious arbitrary shell scripts (e.g., credential theft) from executing when installing third-party dependencies, a [`.npmrc`](.npmrc) file is placed at the root directory to block script execution by default.

```ini
ignore-scripts=true
```

### 2. npm Package Provenance

All published packages have `"publishConfig": { "provenance": true }` enabled in their `package.json`.
This ensures that when releasing to the npm registry, the package is proven (via a provenance signature) to have been published directly from a GitHub Actions workflow build — eliminating the possibility of an attacker injecting a fraudulent build.

### 3. Weekly Automated Dependency Scanning in CI (GitHub Actions)

[`.github/workflows/security.yml`](.github/workflows/security.yml) is configured to run automatic `npm audit` vulnerability scanning for high-severity and above on all PRs and pushes to GitHub. A scheduled scan also triggers automatically every Monday.
