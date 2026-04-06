# ZenMin

ZenMin is a fast, minimal browser built for focus and privacy. Forked from [Min Browser](https://github.com/minbrowser/min), ZenMin extends the original with powerful productivity and well-being features while keeping the clean, distraction-free experience.

## Features

### Core (inherited from Min)

- Full-text search for visited pages
- Ad and tracker blocking
- Automatic reader view
- Bookmark tagging
- Password manager integration
- Dark theme

### ZenMin Additions

- **Third Eye** - Website blocking system with URL/keyword blocking, adult site prevention, and a timer-based access control that uses external time verification (no cheating by changing system clock)
- **Third Eye Whitelist** - A JSON-based whitelist (`thirdEyeWhitelist.json`) to exempt trusted domains from all blocking checks, even if keywords are detected on the page
- **Tab Groups** - Organize tabs into color-coded groups for better workflow management
- **Recently Closed Tabs** - Access up to 50 recently closed tabs from the history page
- **Personalized New Tab Page** - Greeting with your name, IP-based location info, and quick-access cards for your favorite tools

## Getting Started

### Development

- Install [Node.js](https://nodejs.org)
- Run `npm install` to install dependencies
- Start ZenMin in development mode: `npm run start`
- After changes, press `Alt+Ctrl+R` (or `Opt+Cmd+R` on Mac) to reload the browser UI

### Building Binaries

Use one of the following commands to create distributable binaries:

- `npm run buildWindows`
- `npm run buildMacIntel`
- `npm run buildMacArm`
- `npm run buildDebian`
- `npm run buildRaspi` (32-bit Raspberry Pi)
- `npm run buildLinuxArm64` (64-bit ARM Linux)
- `npm run buildRedhat`

## Configuration

### Third Eye Whitelist

Edit `thirdEyeWhitelist.json` in the project root to add domains that should bypass all Third Eye blocking checks:

```json
{
  "whitelist": ["google.com", "github.com", "stackoverflow.com"]
}
```

Whitelisted domains (and their subdomains) will never be blocked, even if blocked keywords appear in their content.

### User Profile

Edit `user.json` in the project root to personalize your new tab page greeting and quick-access links.

## Credits

ZenMin is built on top of [Min Browser](https://github.com/minbrowser/min) by [Palmer Paul](https://github.com/PalmerAL) and contributors. Min is an excellent minimal browser, and ZenMin would not exist without it.

- Original project: [https://github.com/minbrowser/min](https://github.com/minbrowser/min)
- Min website: [https://minbrowser.org](https://minbrowser.org)

## Author

**Ankur Sarkar** - [GitHub](https://github.com/ankur02sarkar) | [LinkedIn](https://www.linkedin.com/in/ankur-sarkar) | [Website](https://ankursarkar.vercel.app)

## License

ZenMin inherits the license from the original Min browser project. See [LICENSE](LICENSE) for details.
