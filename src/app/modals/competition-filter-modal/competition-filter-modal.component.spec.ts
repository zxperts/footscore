import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompetitionFilterModalComponent } from './competition-filter-modal.component';

describe('CompetitionFilterModalComponent', () => {
  let component: CompetitionFilterModalComponent;
  let fixture: ComponentFixture<CompetitionFilterModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompetitionFilterModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CompetitionFilterModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
