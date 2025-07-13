import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamFilterModalComponent } from './team-filter-modal.component';

describe('TeamFilterModalComponent', () => {
  let component: TeamFilterModalComponent;
  let fixture: ComponentFixture<TeamFilterModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamFilterModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeamFilterModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
