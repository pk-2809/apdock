import { Injectable, inject, signal, computed } from '@angular/core';
import { HapticService } from './haptic.service';

export type DynamicIslandMode = 'compact' | 'music' | 'timer' | 'family' | 'health';
export type CategoryFilter = 'all' | 'family' | 'flow' | 'health' | 'home';

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  status: 'home' | 'away' | 'school' | 'office';
  avatarEmoji: string;
  battery: number;
}

export interface TaskItem {
  id: string;
  title: string;
  time: string;
  category: 'family' | 'flow' | 'health' | 'home';
  completed: boolean;
}

export interface SmartDevice {
  id: string;
  name: string;
  room: string;
  state: boolean;
  value?: string;
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class DockAppService {
  private haptics = inject(HapticService);

  // Dynamic Island Reactive State
  readonly islandMode = signal<DynamicIslandMode>('compact');
  readonly isIslandExpanded = signal<boolean>(false);
  readonly timerRemaining = signal<number>(184); // in seconds
  readonly isPlayingAudio = signal<boolean>(true);
  readonly nowPlayingTrack = signal<{ title: string; artist: string }>({
    title: 'Aura of Serenity',
    artist: 'Ambient Soundscape'
  });

  // Current category filter
  readonly selectedCategory = signal<CategoryFilter>('all');

  // Active Bottom Sheet modal data
  readonly activeModal = signal<{
    type: 'family' | 'flow' | 'health' | 'home' | 'settings' | 'new-task' | null;
    title: string;
    subtitle: string;
  } | null>(null);

  // Quadrant 1: Family State
  readonly familyMembers = signal<FamilyMember[]>([
    { id: '1', name: 'Sophia', role: 'Partner', status: 'home', avatarEmoji: '👩🏻', battery: 92 },
    { id: '2', name: 'Liam', role: 'Son', status: 'school', avatarEmoji: '👦🏼', battery: 74 },
    { id: '3', name: 'Emma', role: 'Daughter', status: 'home', avatarEmoji: '👧🏼', battery: 88 },
    { id: '4', name: 'Pranav', role: 'Me', status: 'office', avatarEmoji: '👨🏽‍💻', battery: 96 }
  ]);

  // Quadrant 2: Daily Flow Tasks
  readonly tasks = signal<TaskItem[]>([
    { id: 't1', title: 'Complete mobile native UI architecture', time: '09:30 AM', category: 'flow', completed: true },
    { id: 't2', title: 'Family dinner & weekend roadmap', time: '06:30 PM', category: 'family', completed: false },
    { id: 't3', title: '45-minute HIIT workout session', time: '05:00 PM', category: 'health', completed: false },
    { id: 't4', title: 'Smart home temperature schedule', time: '08:00 PM', category: 'home', completed: true }
  ]);

  // Quadrant 3: Health Rings Metrics
  readonly healthMetrics = signal({
    caloriesBurned: 540,
    caloriesGoal: 650,
    activeMinutes: 38,
    activeMinutesGoal: 45,
    standHours: 10,
    standHoursGoal: 12,
    heartRate: 72,
    steps: 8420
  });

  // Quadrant 4: Smart Home Devices
  readonly homeDevices = signal<SmartDevice[]>([
    { id: 'd1', name: 'Living Climate', room: 'Main Hall', state: true, value: '71°F Eco', icon: '❄️' },
    { id: 'd2', name: 'Smart Vault Lock', room: 'Front Entry', state: true, value: 'Secured', icon: '🔒' },
    { id: 'd3', name: 'Warm Hue Sunset', room: 'Lounge', state: true, value: '80% Soft', icon: '💡' },
    { id: 'd4', name: 'Air Purifier Max', room: 'Bedroom', state: false, value: 'Standby', icon: '🍃' }
  ]);

  // Computed metrics
  readonly completedTasksCount = computed(() => this.tasks().filter(t => t.completed).length);
  readonly familyHomeCount = computed(() => this.familyMembers().filter(m => m.status === 'home').length);

  // Dynamic Island Controllers
  toggleDynamicIsland(): void {
    const next = !this.isIslandExpanded();
    this.isIslandExpanded.set(next);
    this.haptics.trigger(next ? 'island' : 'light');
  }

  setIslandMode(mode: DynamicIslandMode): void {
    this.islandMode.set(mode);
    this.isIslandExpanded.set(true);
    this.haptics.trigger('island');
  }

  collapseIsland(): void {
    if (this.isIslandExpanded()) {
      this.isIslandExpanded.set(false);
      this.haptics.trigger('light');
    }
  }

  toggleMusicPlayback(): void {
    this.isPlayingAudio.update(v => !v);
    this.haptics.trigger('pop');
  }

  // Task interaction
  toggleTask(taskId: string): void {
    this.tasks.update(list =>
      list.map(t => {
        if (t.id === taskId) {
          const next = !t.completed;
          this.haptics.trigger(next ? 'success' : 'selection');
          return { ...t, completed: next };
        }
        return t;
      })
    );
  }

  // Smart Device toggle
  toggleDevice(deviceId: string): void {
    this.homeDevices.update(list =>
      list.map(d => {
        if (d.id === deviceId) {
          const next = !d.state;
          this.haptics.trigger(next ? 'pop' : 'light');
          return { ...d, state: next, value: next ? 'Active' : 'Off' };
        }
        return d;
      })
    );
  }

  // Filter Category
  setCategory(cat: CategoryFilter): void {
    this.selectedCategory.set(cat);
    this.haptics.trigger('selection');
  }

  // Bottom Sheet manager
  openSheet(type: 'family' | 'flow' | 'health' | 'home' | 'settings' | 'new-task', title: string, subtitle: string): void {
    this.activeModal.set({ type, title, subtitle });
    this.haptics.trigger('medium');
  }

  closeSheet(): void {
    this.activeModal.set(null);
    this.haptics.trigger('selection');
  }

  // Quick Action Notification trigger
  sendFamilyPing(): void {
    this.setIslandMode('family');
    this.haptics.trigger('success');
  }
}
