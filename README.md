<p align="center"><img src="./src-tauri/icons/newer.png" height="300"></p>

# PasteStore

PasteStore is a tool to persist, search, and retrieve snippets. PasteStore is not a clipboard manager. PasteStore is intended for more important and generally long-lived snippets.

# Using

The binary is not signed because that costs $99/yr. Running `xattr -cr /Applications/PasteStore.app` may be required for the app to run. You may see an error that the app is "damaged and can't be opened" if you need to do this.

# Creating a Release

1. Get all changes into `main`
2. Make sure to change the version number in `tauri.conf.json`
3. Run `bun run tauri:release` with a `.env` file that has `TAURI_PRIVATE_KEY`
4. Make sure to enter the password when prompted or the signature will not be updated
5. Create a new GitHub release with the new `dmg` file and `PasteStore.app.tar.gz `
6. Update `release.json` with the new version, change message, timestamp, release URL, and signature from `PasteStore.app.tar.gz.sig`
7. Push the new `release.json` to `main`
8. Done!
