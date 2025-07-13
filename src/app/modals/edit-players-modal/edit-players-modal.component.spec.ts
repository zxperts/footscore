import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPlayersModalComponent } from './edit-players-modal.component';

describe('EditPlayersModalComponent', () => {
  let component: EditPlayersModalComponent;
  let fixture: ComponentFixture<EditPlayersModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPlayersModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditPlayersModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
