/// <reference path="./pedro.d.ts" />

// Plugin: Registry Debugger
// Version: 1.0
// Description: User-friendly diagnostics tool to verify plugin system health.

console.log("[RegistryDebugger] Loading...");

function runDiagnostics() {
    let report = "Registry Diagnostics Report:\n\n";
    let issues = 0;

    // 1. Check Stores
    try {
        const project = pedro.stores.project;
        if (project && project.extraDataStore) {
            report += "✅ Project Stores: Accessible\n";
        } else {
            report += "❌ Project Stores: Missing/Inaccessible\n";
            issues++;
        }
    } catch (e) {
        report += `❌ Store Check Failed: ${e}\n`;
        issues++;
    }

    // 2. Check Navbar Actions
    try {
        // We use the internal registry store access via the API
        // pedro.registries.navbarActions is the registry object with .register/.subscribe
        // We need to subscribe to see contents.
        let actions = [];
        const unsubscribe = pedro.registries.navbarActions.subscribe(val => {
            actions = val;
        });
        unsubscribe(); // immediate read

        const hasAnnotationBtn = actions.some(a => a.id === "add-annotation-btn");
        if (hasAnnotationBtn) {
            report += "✅ Navbar Registry: 'Add Note' button found\n";
        } else {
            report += "❌ Navbar Registry: 'Add Note' button MISSING\n";
            issues++;
        }
        report += `ℹ️ Total Navbar Actions: ${actions.length}\n`;

    } catch (e) {
        report += `❌ Navbar Check Failed: ${e}\n`;
        issues++;
    }

    // 3. Check Context Menu
    try {
        let items = [];
        const unsubscribe = pedro.registries.contextMenuItems.subscribe(val => {
            items = val;
        });
        unsubscribe();

        const hasAdd = items.some(i => i.id === "add-annotation");
        const hasDelete = items.some(i => i.id === "delete-annotation");

        if (hasAdd && hasDelete) {
            report += "✅ Context Menu: Annotation items found\n";
        } else {
            report += `❌ Context Menu: Missing items (Add: ${hasAdd}, Delete: ${hasDelete})\n`;
            issues++;
        }
    } catch (e) {
        report += `❌ Context Menu Check Failed: ${e}\n`;
        issues++;
    }

    // 4. Check Field Renderers
    try {
        let renderers = [];
        const unsubscribe = pedro.registries.fieldRenderers.subscribe(val => {
            renderers = val;
        });
        unsubscribe();

        const hasRenderer = renderers.some(r => r.id === "annotation-renderer");
        if (hasRenderer) {
            report += "✅ Field Renderer: 'annotation-renderer' active\n";
        } else {
            report += "❌ Field Renderer: 'annotation-renderer' MISSING\n";
            issues++;
        }
    } catch (e) {
        report += `❌ Field Renderer Check Failed: ${e}\n`;
        issues++;
    }

    report += "\n";
    if (issues === 0) {
        report += "🎉 All systems nominal. Plugin integration appears correct.";
    } else {
        report += `⚠️ Found ${issues} potential issues. Please report this.`;
    }

    alert(report);
}

// Register the diagnostics button
pedro.registries.navbarActions.register({
    id: "registry-debugger-btn",
    title: "Run Diagnostics",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
</svg>
`,
    location: "left", // Put it on the left to distinguish from main tools
    order: 99,
    onClick: runDiagnostics
});
