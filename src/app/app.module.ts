import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { PlayerSelectorComponent } from './player-selector/player-selector.component';


@NgModule({
  declarations: [
    AppComponent, 
    PlayerSelectorComponent
  ],

  imports: [
    BrowserModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { } 