import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTeamModalComponent } from './new-team-modal.component';

describe('NewTeamModalComponent', () => {
  let component: NewTeamModalComponent;
  let fixture: ComponentFixture<NewTeamModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTeamModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewTeamModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
