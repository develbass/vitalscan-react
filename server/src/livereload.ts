import { watch, access, constants, writeFile } from 'fs';
import { dirname, basename } from 'path';
import { createServer, type LiveReloadServer } from 'livereload';

export default class LiveReload {
  liveReloadServer: LiveReloadServer;

  constructor(watchedFile: string) {
    this.liveReloadServer = createServer({ extraExts: ['mjs'] });

    // Check if file exists, if not create it, then watch
    access(watchedFile, constants.F_OK, (err) => {
      if (err) {
        // File doesn't exist, create it
        writeFile(watchedFile, '', (writeErr) => {
          if (writeErr) {
            console.warn(`Could not create ${watchedFile}:`, writeErr);
            // Watch directory instead if file creation fails
            this.watchDirectory(dirname(watchedFile), watchedFile);
          } else {
            // File created, now watch it
            this.watchFile(watchedFile);
          }
        });
      } else {
        // File exists, watch it
        this.watchFile(watchedFile);
      }
    });
  }

  watchFile(watchedFile: string) {
    // Watch for the `dist/.build-done` file change
    watch(watchedFile, (eventType) => {
      if (eventType === 'change') {
        this.refresh();
      }
    });
  }

  watchDirectory(directory: string, targetFile: string) {
    // Watch directory for file creation
    const targetFileName = basename(targetFile);
    watch(directory, (eventType, filename) => {
      if (eventType === 'rename' && filename === targetFileName) {
        // File was created, switch to watching the file
        this.watchFile(targetFile);
        this.refresh();
      }
    });
  }

  refresh() {
    console.log('Build completed. Reloading page...');
    this.liveReloadServer.refresh('/');
  }

  init() {
    this.liveReloadServer.server.once('connection', () => {
      setTimeout(() => {
        this.liveReloadServer.refresh('/');
      }, 100);
    });
  }
}
