import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerGoalsModalComponent } from './player-goals-modal.component';

describe('PlayerGoalsModalComponent', () => {
  let component: PlayerGoalsModalComponent;
  let fixture: ComponentFixture<PlayerGoalsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerGoalsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlayerGoalsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
