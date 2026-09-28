// Autopiloto SOLO para el harness de pruebas visuales (no se incluye en index.html final).
// Lee location.hash para dejar la app en un estado concreto y así poder capturarlo con
// Chrome headless de un solo disparo (sin CDP).
(function () {
  const step = new URLSearchParams(location.hash.slice(1)).get('paso');
  if (!step) return;
  setTimeout(() => {
    try {
      if (step === 'unidad' || step === 'combate' || step === 'resultado' || step === 'empate' || step === 'ajustes' || step === 'claro') {
        App.selectCiv('A', 'Egipto'); App.toggleCivReady('A');
        App.selectCiv('B', 'Griegos'); App.toggleCivReady('B');
      }
      if (step === 'combate' || step === 'resultado' || step === 'ajustes' || step === 'claro') {
        App.selectUnit('A', 'Anubite'); App.toggleUnitReady('A');
        App.selectUnit('B', 'Centaur'); App.toggleUnitReady('B');
      }
      if (step === 'resultado') {
        state.players.A.die1 = 4; state.players.A.die2 = 3;
        state.players.B.die1 = 2; state.players.B.die2 = 6;
        resolveAndShow();
      }
      if (step === 'ajustes') { App.openSettings(); }
      if (step === 'claro') { App.setTheme('claro'); }
      if (step === 'empate') {
        state.screen = 'civ';
        state.players = { A: freshPlayer(), B: freshPlayer() };
        App.selectCiv('A', 'Nordicos'); App.toggleCivReady('A');
        App.selectCiv('B', 'Griegos'); App.toggleCivReady('B');
        App.selectUnit('A', 'Jarl'); App.toggleUnitReady('A');
        App.selectUnit('B', 'Hippokon'); App.toggleUnitReady('B');
        state.players.A.die1 = 3; state.players.A.die2 = 3;
        state.players.B.die1 = 2; state.players.B.die2 = 4;
        resolveAndShow();
      }
      document.title = 'AUTOPILOT_DONE:' + step;
    } catch (e) {
      document.title = 'AUTOPILOT_ERROR:' + e.message;
    }
  }, 50);
})();
