# Plugins

Plugins are a powerful way to extend the functionality of the **Pedro Pathing** library. They allow the community to add new features, support custom hardware, or integrate with other libraries without modifying the core codebase.

---

## 📥 How to Add Plugins

To use a plugin in your FTC project, you generally need to add it as a dependency in your build configuration.

### 1. Add Repositories
Ensure your project can find the plugin. In your `build.gradle` (Module: app) or `settings.gradle` file, add the necessary Maven repositories.

```groovy
repositories {
    mavenCentral()
    maven { url 'https://jitpack.io' }
    // Add other repositories as required by the plugin
}
```

### 2. Add Dependencies
Add the plugin dependency to your `dependencies` block in `build.gradle` (Module: app).

```groovy
dependencies {
    implementation 'com.pedropathing:ftc:2.0.0' // Core library
    implementation 'com.example:some-plugin:1.0.0' // The plugin
}
```

---

## 🛠️ Designing Plugins

Want to create your own plugin? Here's how to get started.

### 1. Create a Library Module
In Android Studio, create a new **Android Library** module. This ensures your code is packaged correctly for other teams to use.

### 2. Define Dependencies
Your plugin will likely depend on the core Pedro Pathing library. Add it as a dependency in your library's `build.gradle`.

```groovy
dependencies {
    compileOnly 'com.pedropathing:ftc:2.0.0'
}
```
*Using `compileOnly` ensures you don't bundle the core library with your plugin, preventing version conflicts.*

### 3. Implement Your Logic
You can now extend existing classes, implement interfaces, or create new utilities that work alongside Pedro Pathing.

---

## 🚀 Using Plugins

Plugins can introduce new commands, path builders, or tuners.

- **Check Documentation:** Always refer to the specific plugin's README for usage instructions.
- **OpMode Integration:** Most plugins will require you to initialize them in your `OpMode` or pass your `Follower` instance to them.

---

## 🧩 Examples

- **PedroPathingPlus:** A plugin that adds direct `.pp` file execution and command-based features.
