document.addEventListener('DOMContentLoaded', () => {
  // Formatter de moeda BRL com 2 casas
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  // API base (dev: frontend 5500 -> backend Django 8000)
  const API_BASE = window.API_BASE || (location.port === '5500' ? 'http://127.0.0.1:8000' : '');
  // Ano no footer
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

  // Função para capitalizar primeira letra de cada palavra
  function capitalize(str) {
    const preposicoes = ['da', 'de', 'do', 'e', 'das', 'dos'];
    return str.replace(/\b[\w\u00C0-\u017F]+/g, (word, index) => {
      const lowerWord = word.toLowerCase();
      // Primeira palavra sempre maiúscula, preposições ficam minúsculas
      if (index === 0 || !preposicoes.includes(lowerWord)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return lowerWord;
    });
  }

  // Formatador de moeda brasileira para input
  function formatCurrency(value) {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    // Converte para centavos
    const amount = parseFloat(numbers) / 100;
    
    // Limite máximo: R$ 100.000.000,00
    const maxAmount = 100000000;
    if (amount > maxAmount) {
      const limitedNumbers = (maxAmount * 100).toString();
      const limitedAmount = parseFloat(limitedNumbers) / 100;
      return limitedAmount.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
      });
    }
    
    // Formata como moeda brasileira
    if (isNaN(amount) || amount === 0) return '';
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
  }

  // Formatador de telefone brasileiro
  function formatPhone(value) {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (DDD + 9 dígitos)
    const limited = numbers.slice(0, 11);
    
    // Aplica máscara baseada no tamanho
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    } else if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 3)} ${limited.slice(3, 7)}-${limited.slice(7, 11)}`;
    }
  }

  // Validador de telefone brasileiro
  function isValidPhone(phone) {
    const numbers = phone.replace(/\D/g, '');
    // Deve ter 10 ou 11 dígitos (DDD + número)
    if (numbers.length < 10 || numbers.length > 11) return false;
    
    // DDD deve estar entre 11 e 99
    const ddd = parseInt(numbers.slice(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    
    // Se tem 11 dígitos, o 3º deve ser 9 (celular)
    if (numbers.length === 11 && numbers[2] !== '9') return false;
    
    return true;
  }

    // Configurar campos com formatação automática
  const nomeField = document.querySelector('input[name="nome"]');
  const cidadeField = document.querySelector('input[name="cidade"]');
  const valorContaField = document.querySelector('input[name="valor_conta"]');
  const whatsField = document.querySelector('input[name="whats"]');

  // Capitalização automática para nome e cidade
  [nomeField, cidadeField].forEach(field => {
    if (field) {
      field.addEventListener('input', (e) => {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = capitalize(e.target.value);
        e.target.setSelectionRange(start, end);
      });
    }
  });

  // Formatação de telefone brasileiro
  if (whatsField) {
    whatsField.placeholder = '(11) 9 9999-9999';
    whatsField.addEventListener('input', (e) => {
      const formatted = formatPhone(e.target.value);
      e.target.value = formatted;
      
      // Validação visual
      const isValid = isValidPhone(formatted);
      if (formatted.length > 0) {
        e.target.style.borderColor = isValid ? '#10B981' : '#EF4444';
      } else {
        e.target.style.borderColor = '';
      }
    });
  }

  // Formatação de moeda para valor da conta
  if (valorContaField) {
    valorContaField.type = 'text';
    valorContaField.inputMode = 'numeric';
    valorContaField.placeholder = 'R$ 0,00';
    
    valorContaField.addEventListener('input', (e) => {
      const formatted = formatCurrency(e.target.value);
      e.target.value = formatted;
    });

    // Remove formatação para envio do formulário
    valorContaField.addEventListener('blur', (e) => {
      if (e.target.value) {
        const numbers = e.target.value.replace(/\D/g, '');
        const amount = Math.min(parseFloat(numbers) / 100, 100000000);
        e.target.dataset.rawValue = amount.toString();
      }
    });
  }

  // Helper analytics
  function track(event, params={}){
    try{ if (window.gtag) window.gtag('event', event, params); }catch(e){}
    try{ if (window.fbq) window.fbq('trackCustom', event, params); }catch(e){}
  }

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
    track('lead_submit_attempt');

    // Honeypot
    const hp = form.querySelector('input[name="website"]');
    if (hp && hp.value.trim() !== '') {
      feedback.textContent = 'Erro de validação.'; return;
    }

    // Validação de telefone
    const whatsInput = form.querySelector('input[name="whats"]');
    if (whatsInput && !isValidPhone(whatsInput.value)) {
      feedback.textContent = 'Por favor, insira um número de WhatsApp válido.';
      whatsInput.focus();
      return;
    }

    feedback.textContent = 'Enviando...';

    async function submitLead(token){
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      
      // Usar valor numérico do campo de moeda se disponível
      if (valorContaField && valorContaField.dataset.rawValue) {
        payload.valor_conta = valorContaField.dataset.rawValue;
      } else if (payload.valor_conta) {
        // Fallback: extrair números do valor formatado
        const numbers = payload.valor_conta.replace(/\D/g, '');
        payload.valor_conta = (parseFloat(numbers) / 100).toString();
      }
      
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
        
        // Evento de conversão para Google Analytics
        track('generate_lead', {
          event_category: 'engagement',
          event_label: 'lead_form_submit',
          value: payload.valor_conta || 0
        });
        
        // Evento do Meta Pixel (quando habilitado)
        try{ if (window.fbq) window.fbq('track','Lead'); }catch(e){}
        form.reset();
      }catch(err){
        feedback.textContent = 'Não foi possível enviar agora. Tente novamente em instantes.';
        track('lead_submit_error', { reason: (err && err.message) || 'unknown' });
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
