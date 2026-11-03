/*
 * Visor de flipbook para antoraz.com y alejandro.antoraz.com
 * Busca los bloques .flipbook de la página y monta en cada uno un libro
 * con efecto de pasar página (StPageFlip). Solo descarga las páginas
 * cuando el bloque se acerca a la zona visible.
 */
(function () {
  var LIBRERIA = '/flipbook/page-flip.browser.js';
  var cargaLibreria = null;

  function cargarLibreria() {
    if (window.St) return Promise.resolve();
    if (!cargaLibreria) {
      cargaLibreria = new Promise(function (ok, error) {
        var s = document.createElement('script');
        s.src = LIBRERIA;
        s.onload = ok;
        s.onerror = error;
        document.head.appendChild(s);
      });
    }
    return cargaLibreria;
  }

  function medirPrimeraPagina(url) {
    return new Promise(function (ok, error) {
      var img = new Image();
      img.onload = function () { ok({ ancho: img.naturalWidth, alto: img.naturalHeight }); };
      img.onerror = error;
      img.src = url;
    });
  }

  function montar(bloque) {
    var paginas = JSON.parse(bloque.querySelector('script[type="application/json"]').textContent);
    var escenario = bloque.querySelector('.flipbook-escenario');
    var libroEl = bloque.querySelector('.flipbook-libro');
    var cont = bloque.querySelector('.flipbook-contador');
    var ant = bloque.querySelector('.flipbook-ant');
    var sig = bloque.querySelector('.flipbook-sig');
    var total = paginas.length;

    Promise.all([cargarLibreria(), medirPrimeraPagina(paginas[0])]).then(function (r) {
      var med = r[1];
      bloque.style.setProperty('--flipbook-ratio', med.alto / med.ancho);

      var libro = new St.PageFlip(libroEl, {
        width: med.ancho,
        height: med.alto,
        size: 'stretch',
        minWidth: 200,
        maxWidth: med.ancho,
        minHeight: Math.round(200 * med.alto / med.ancho),
        maxHeight: med.alto,
        showCover: true,
        usePortrait: true,
        maxShadowOpacity: 0.4,
        flippingTime: 800,
        mobileScrollSupport: false
      });

      function actualizar() {
        var i = libro.getCurrentPageIndex();
        var vertical = libro.getOrientation() === 'portrait';
        var txt;
        if (vertical || i === 0 || i === total - 1) {
          txt = String(i + 1);
        } else {
          var izq = i % 2 ? i + 1 : i;
          txt = izq + '–' + Math.min(izq + 1, total);
        }
        cont.textContent = txt + ' / ' + total;
        ant.disabled = i === 0;
        sig.disabled = i >= total - 1 || (!vertical && i !== 0 && i + 1 >= total - 1);
      }

      libro.on('init', function () { bloque.classList.add('listo'); actualizar(); });
      libro.on('flip', actualizar);
      libro.on('changeOrientation', actualizar);
      libro.loadFromImages(paginas);

      ant.addEventListener('click', function () { libro.flipPrev(); });
      sig.addEventListener('click', function () { libro.flipNext(); });
      bloque.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') libro.flipPrev();
        if (e.key === 'ArrowRight') libro.flipNext();
      });
    }).catch(function () {
      escenario.innerHTML = '<p class="flipbook-error">No se ha podido cargar el documento.</p>';
      bloque.classList.add('listo');
    });
  }

  function iniciar() {
    var bloques = document.querySelectorAll('.flipbook');
    if (!bloques.length) return;
    if (!('IntersectionObserver' in window)) { bloques.forEach(montar); return; }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { obs.unobserve(e.target); montar(e.target); }
      });
    }, { rootMargin: '400px 0px' });
    bloques.forEach(function (b) { obs.observe(b); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
