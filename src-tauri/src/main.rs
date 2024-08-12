use tauri::GlobalShortcutManager;
use tauri::{
    ActivationPolicy, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};
use tauri_plugin_positioner::{Position, WindowExt};
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit").accelerator("Cmd+Q");
    let version = CustomMenuItem::new("version".to_string(), "0.0.2-alpha").disabled();
    let system_tray_menu = SystemTrayMenu::new()
        .add_item(version)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: "
                PRAGMA foreign_keys = ON;
                create table paste (
                    id INTEGER PRIMARY KEY,
                    value BLOB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CHECK(LENGTH(value) > 0)
                );
                create table tag (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(name),
                    CHECK(LENGTH(name) > 0)
                );
                create table paste_tag (
                    paste_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    seq_id INTEGER NOT NULL,
                    PRIMARY KEY (paste_id, tag_id),
                    FOREIGN KEY (paste_id) REFERENCES paste(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE,
                    CHECK(seq_id >= 0)
                );
            ",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_positioner::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:pastestore.db", migrations)
                .build(),
        )
        .system_tray(SystemTray::new().with_menu(system_tray_menu))
        .setup(|app| {
            let handle = app.handle();
            app.set_activation_policy(ActivationPolicy::Accessory);

            handle
                .global_shortcut_manager()
                .register("CommandOrControl+Shift+H", move || {
                    println!("shortcut pressed");
                })
                .unwrap();

            Ok(())
        })
        .on_system_tray_event(|app, event| {
            tauri_plugin_positioner::on_tray_event(app, &event);
            match event {
                SystemTrayEvent::LeftClick { .. } => {
                    let window = app.get_window("main").unwrap();
                    let _ = window.move_window(Position::TrayCenter);
                    if window.is_visible().unwrap() {
                        window.hide().unwrap();
                        app.emit_all("window-closed", "").unwrap();
                    } else {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                        app.emit_all("window-opened", "").unwrap();
                    }
                }
                SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                },
                _ => {}
            }
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::Focused(is_focused) => {
                if !is_focused {
                    event.window().hide().unwrap();
                    event
                        .window()
                        .app_handle()
                        .emit_all("window-closed", "")
                        .unwrap();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
