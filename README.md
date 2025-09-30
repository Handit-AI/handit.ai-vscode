# Handit Login VS Code Extension

A modern VS Code extension with a beautiful login interface built using React and TypeScript.

## 🏗️ Project Structure

```
handit-login-extension/
├── 📁 src/                          # Extension source code
│   ├── 📄 extension.ts              # Main extension entry point
│   └── 📄 loginPanelProvider.ts     # Webview provider
├── 📁 webview/                      # React webview application
│   ├── 📁 src/                      # React source code
│   │   ├── 📄 App.tsx              # Main React component
│   │   ├── 📄 main.tsx             # React entry point
│   │   ├── 📄 styles.css           # Global styles
│   │   ├── 📁 components/          # React components
│   │   │   └── 📄 LoginForm.tsx    # Login form component
│   │   └── 📁 hooks/               # Custom React hooks
│   │       └── 📄 useVSCode.ts     # VS Code integration hook
│   ├── 📁 dist/                    # Built webview files
│   ├── 📄 package.json             # Webview dependencies
│   ├── 📄 vite.config.ts           # Vite configuration
│   └── 📄 tsconfig.json            # TypeScript config
├── 📁 .vscode/                      # VS Code configuration
│   ├── 📄 launch.json              # Debug configuration
│   └── 📄 tasks.json               # Build tasks
├── 📁 out/                          # Compiled extension files
├── 📄 package.json                  # Extension manifest
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 .eslintrc.json               # ESLint configuration
└── 📄 .vscodeignore                # Files to ignore in package
```

## 🚀 Features

- **Modern Login UI**: Beautiful, responsive login form with VS Code theme integration
- **VS Code Integration**: Seamless communication between webview and extension
- **TypeScript**: Full type safety throughout the codebase
- **React 18**: Modern React with hooks and functional components
- **Vite Build**: Fast development and optimized production builds
- **Theme Support**: Automatically adapts to VS Code light/dark themes
- **Form Validation**: Client-side validation with error handling
- **Loading States**: Smooth loading indicators and disabled states
- **Social Login**: UI for Google and GitHub authentication (UI only)

## 🛠️ Development

### Prerequisites

- Node.js 16+ 
- VS Code 1.74+
- npm or yarn

### Setup

1. **Install extension dependencies:**
   ```bash
   npm install
   ```

2. **Install webview dependencies:**
   ```bash
   cd webview
   npm install
   cd ..
   ```

3. **Build the webview:**
   ```bash
   npm run build-webview
   ```

4. **Compile the extension:**
   ```bash
   npm run compile
   ```

### Development Mode

1. **Start webview development server:**
   ```bash
   npm run dev-webview
   ```

2. **Enable development mode in VS Code:**
   - Open VS Code settings
   - Search for "handitLogin.devMode"
   - Set to `true`

3. **Run the extension:**
   - Press `F5` or use `Cmd+Shift+P` → "Debug: Start Debugging"
   - This opens a new "Extension Development Host" window

### Available Scripts

#### Extension Scripts
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Compile in watch mode
- `npm run build-webview` - Build React webview for production
- `npm run dev-webview` - Start webview development server
- `npm run lint` - Run ESLint

#### Webview Scripts (in webview/ directory)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎨 Design Features

### Login Form
- **Email Input**: With validation and error states
- **Password Input**: With show/hide toggle
- **Remember Me**: Checkbox for persistent login
- **Forgot Password**: Link for password recovery
- **Sign In Button**: With loading state and spinner
- **Social Login**: Google and GitHub buttons (UI only)

### VS Code Integration
- **Theme Support**: Automatically adapts to VS Code themes
- **Message Passing**: Bidirectional communication with extension
- **Responsive Design**: Works on different panel sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Styling
- **CSS Variables**: Uses VS Code theme variables
- **Modern Design**: Clean, professional appearance
- **Smooth Animations**: Hover effects and transitions
- **High Contrast**: Support for high contrast mode

## 🔧 Configuration

### Extension Settings

The extension provides the following settings:

- `handitLogin.apiUrl` (string): API URL for Handit services (default: "https://api.handit.ai")
- `handitLogin.devMode` (boolean): Enable development mode for webview (default: false)

### Development vs Production

- **Development Mode**: Webview loads from `http://localhost:5173` for hot reload
- **Production Mode**: Webview loads from bundled files in `webview/dist/`

## 📦 Packaging

To create a VS Code extension package:

1. **Install vsce:**
   ```bash
   npm install -g vsce
   ```

2. **Package the extension:**
   ```bash
   vsce package
   ```

This creates a `.vsix` file that can be installed in VS Code.

## 🏛️ Architecture

### Extension Layer (TypeScript)
- **extension.ts**: Main entry point, registers commands and providers
- **loginPanelProvider.ts**: Manages webview lifecycle and communication

### Webview Layer (React)
- **App.tsx**: Main application component
- **LoginForm.tsx**: Login form with validation and state management
- **useVSCode.ts**: Custom hook for VS Code API integration

### Communication Flow
1. User interacts with React components
2. Components use `useVSCode` hook to send messages
3. Extension receives messages via `onDidReceiveMessage`
4. Extension can send responses back to webview
5. React components update based on responses

## 🎯 Best Practices Implemented

- **Separation of Concerns**: Clear separation between extension and webview
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Proper error boundaries and validation
- **Performance**: Optimized builds and lazy loading
- **Accessibility**: ARIA labels and keyboard navigation
- **Theme Integration**: Seamless VS Code theme adaptation
- **Development Experience**: Hot reload and debugging support

## 📝 Notes

- This is a **design-only** implementation with no actual authentication functionality
- The login form is fully functional from a UI perspective
- All form validation and error handling is implemented
- Social login buttons are present but non-functional
- The extension follows VS Code extension best practices and patterns

## 🔗 Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
