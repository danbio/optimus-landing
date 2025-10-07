document.addEventListener('DOMContentLoaded', () => {
  // Formatter de moeda BRL com 2 casas
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  // API base (dev: frontend 5500 -> backend Django 8000)
  const API_BASE = window.API_BASE || (location.port === '5500' ? 'http://127.0.0.1:8000' : '');
  // Ano no footer
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

  // Scroll suave
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        e.preventDefault();
        document.querySelector(id)?.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });

  // Calculadora com reajuste anual de 9% e economia de 95%
  const valorConta = document.getElementById('valor-conta');
  const resultado = document.getElementById('resultado-economia');
  const calcSummary = document.getElementById('calc-summary');
  const calcFun = document.getElementById('calc-fun');
  valorConta?.addEventListener('input', () => {
    const v = parseFloat(valorConta.value || '0');
    const RATE_ECONOMIA = 0.95; // 95% de economia
    const REAJUSTE_ANUAL = 0.09; // 9% ao ano

    if (!resultado) return;

    if (v > 0) {
      const gastoAnualAno1 = v * 12; // ano base
      const economiaAno1 = gastoAnualAno1 * RATE_ECONOMIA;

      // Arrays para gráfico
      const economias = [];
      let acumulado25 = 0;
      let totalSemSolar = 0;
      let totalComSolar = 0;
      for (let i = 0; i < 25; i++) {
        const fator = Math.pow(1 + REAJUSTE_ANUAL, i);
        const gastoAnualNoAnoI = gastoAnualAno1 * fator;
        const economiaNoAnoI = gastoAnualNoAnoI * RATE_ECONOMIA;
        const gastoComSolarNoAnoI = gastoAnualNoAnoI - economiaNoAnoI; // pagando só 5%
        totalSemSolar += gastoAnualNoAnoI;
        totalComSolar += gastoComSolarNoAnoI;
        acumulado25 += economiaNoAnoI;
        economias.push(economiaNoAnoI);
      }

      resultado.innerHTML = `
        <div>
          <strong>Estimativa:</strong>
          <div>Economia no ano 1: <b>${BRL.format(r2(economiaAno1))}</b></div>
          <div>Em 25 anos (reajuste de 9% a.a.): <b>${BRL.format(r2(acumulado25))}</b></div>
          <small style=\"color:#6b7280\">Valores estimados. Consumos e tarifas reais podem variar.</small>
        </div>`;

      // Resumo comparativo
      if (calcSummary){
        calcSummary.innerHTML = `
          <div>
            <h4>Sem energia solar</h4>
            <strong>${BRL.format(r2(totalSemSolar))}</strong>
          </div>
          <div>
            <h4>Com energia solar</h4>
            <strong>${BRL.format(r2(totalComSolar))}</strong>
          </div>`;
      }

      // Seção: o que essa economia pode comprar
      if (calcFun){
        const precos = {
          hb20: 90000,
          hilux: 320000,
          viagemPortoDeGalinhas: 7000, // por pessoa; casal = 14k
          iphone: 7000,
          moto: 15000,
          piscina: 35000,
          painelSolarResidencial: 25000,
        };
        const itens = [
          { kicker: 'Carro popular', label: 'Hyundai HB20', qtd: Math.floor(acumulado25 / precos.hb20) },
          { kicker: 'Picape média', label: 'Toyota Hilux', qtd: Math.floor(acumulado25 / precos.hilux) },
          { kicker: 'Viagens com acompanhante', label: 'Porto de Galinhas (7 dias)', qtd: Math.floor(acumulado25 / (precos.viagemPortoDeGalinhas*2)) },
          { kicker: 'Top de linha', label: 'iPhone', qtd: Math.floor(acumulado25 / precos.iphone) },
          { kicker: 'Duas rodas', label: 'Moto 150cc', qtd: Math.floor(acumulado25 / precos.moto) },
          { kicker: 'Lazer em casa', label: 'Piscinas residenciais', qtd: Math.floor(acumulado25 / precos.piscina) },
          { kicker: 'Energia', label: 'Sistemas solares residenciais', qtd: Math.floor(acumulado25 / precos.painelSolarResidencial) },
        ].filter(x => x.qtd > 0);
        const cards = itens.slice(0,6).map(x => `
          <div class="item">
            <div class="kicker">${x.kicker}</div>
            <div class="big">${x.qtd}×</div>
            <div class="label">${x.label}</div>
          </div>`).join('');
        calcFun.innerHTML = `
          <h4>Com essa economia você poderia comprar...</h4>
          <div class="items">${cards || '<div class=\"label\">Informe um valor para ver ideias :)</div>'}</div>`;
      }
    } else {
      resultado.innerHTML = '';
      if (calcSummary) calcSummary.innerHTML = '';
      if (calcFun) calcFun.innerHTML = '';
    }
  });

  // Formulário de lead (com honeypot e reCAPTCHA opcional)
  const form = document.getElementById('lead-form');
  const feedback = document.getElementById('form-feedback');

  async function verifyRecaptcha(token){
    try{
      const r = await fetch(`${API_BASE}/api/recaptcha/verify/`, { // ajuste para o host da API quando publicar
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, action:'submit' })
      });
      return await r.json();
    }catch(e){ return { ok:false, error:'fetch_failed' }; }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Honeypot
    const hp = form.querySelector('input[name="website"]');
    if (hp && hp.value.trim() !== '') {
      feedback.textContent = 'Erro de validação.'; return;
    }

    feedback.textContent = 'Enviando...';

    async function submitLead(token){
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      payload.valor_conta = payload.valor_conta || payload['valor_conta'] || '';
      if (token) payload.recaptcha_token = token;
      try{
        const r = await fetch(`${API_BASE}/api/leads/`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        const data = await r.json().catch(()=>({ok:false}));
        if (!r.ok || !data.ok){
          throw new Error(data.error || `HTTP ${r.status}`);
        }
        feedback.textContent = 'Recebido! Em breve entraremos em contato.';
        form.reset();
      }catch(err){
        feedback.textContent = 'Não foi possível enviar agora. Tente novamente em instantes.';
      }
    }

    // Se tiver reCAPTCHA v3 carregado, gera token, valida e envia
    if (window.grecaptcha && window.RECAPTCHA_SITE_KEY){
      try{
        await grecaptcha.ready(async () => {
          const token = await grecaptcha.execute(window.RECAPTCHA_SITE_KEY, { action:'submit' });
          const res = await verifyRecaptcha(token);
          if (!res.ok || (res.score ?? 0) < 0.5){
            feedback.textContent = 'Falha na verificação anti-spam. Tente novamente.'; return;
          }
          await submitLead(token);
        });
      }catch{ feedback.textContent = 'Erro ao validar reCAPTCHA.'; }
      return;
    }

    // Sem reCAPTCHA (modo dev): envia mesmo assim
    await submitLead(null);
  });
});
