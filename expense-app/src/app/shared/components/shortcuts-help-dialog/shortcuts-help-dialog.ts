import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { KeyboardShortcutsService } from '../../../core/services/keyboard-shortcuts.service';

/**
 * Shortcuts Help Dialog
 * Displays all available keyboard shortcuts
 */
@Component({
  selector: 'app-shortcuts-help-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './shortcuts-help-dialog.html',
  styleUrl: './shortcuts-help-dialog.scss'
})
export class ShortcutsHelpDialog implements OnInit {
  shortcutGroups: Array<{ group: string; shortcuts: Array<{ key: string; description: string }> }> = [];

  constructor(
    private dialogRef: MatDialogRef<ShortcutsHelpDialog>,
    private keyboardService: KeyboardShortcutsService
  ) {}

  ngOnInit(): void {
    this.loadShortcuts();
  }

  /**
   * Load shortcuts from service and format for display
   */
  loadShortcuts(): void {
    const groups = this.keyboardService.getShortcutsForHelp();

    this.shortcutGroups = groups.map(group => ({
      group: group.group,
      shortcuts: group.shortcuts.map(shortcut => ({
        key: this.keyboardService.formatShortcut(shortcut),
        description: shortcut.description
      }))
    }));
  }

  /**
   * Close dialog
   */
  close(): void {
    this.dialogRef.close();
  }
}
