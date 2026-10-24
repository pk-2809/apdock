import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IosStatusBarComponent } from './components/ios-status-bar/ios-status-bar.component';
import { DynamicIslandComponent } from './components/dynamic-island/dynamic-island.component';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { SegmentedFilterComponent } from './components/segmented-filter/segmented-filter.component';
import { QuadrantGridComponent } from './components/quadrant-grid/quadrant-grid.component';
import { IosDockComponent } from './components/ios-dock/ios-dock.component';
import { IosBottomSheetComponent } from './components/ios-bottom-sheet/ios-bottom-sheet.component';
import { DockAppService } from './core/services/dock-app.service';
import { HapticService } from './core/services/haptic.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    IosStatusBarComponent,
    DynamicIslandComponent,
    AppHeaderComponent,
    SegmentedFilterComponent,
    QuadrantGridComponent,
    IosDockComponent,
    IosBottomSheetComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  dock = inject(DockAppService);
  haptics = inject(HapticService);
}
