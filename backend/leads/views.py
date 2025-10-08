import json
import os
import urllib.request
import time
import re

from django.conf import settings
from django.http import JsonResponse, HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt

from .models import Lead


def _verify_recaptcha(token: str, remoteip: str | None) -> tuple[bool, float | None, dict | None]:
    """Valida reCAPTCHA v3. Retorna (ok, score, detalhes)."""
    secret = getattr(settings, 'RECAPTCHA_SECRET', '') or os.environ.get('RECAPTCHA_SECRET', '')
    if not token or not secret:
        return False, None, {"error": "missing_secret_or_token"}

    verify_url = 'https://www.google.com/recaptcha/api/siteverify'
    params = f'secret={secret}&response={token}' + (f'&remoteip={remoteip}' if remoteip else '')
    req = urllib.request.Request(
        verify_url,
        data=params.encode('utf-8'),
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return False, None, {"error": "recaptcha_request_failed", "details": str(e)}

    success = result.get('success') is True
    score = float(result.get('score', 0)) if 'score' in result else None
    return success, score, result


def _get_client_ip(request) -> str | None:
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# Rate limiting simples em memória por processo
_RATE_BUCKET: dict[str, list[float]] = {}
_RATE_WINDOW = int(os.environ.get('LEAD_RATE_WINDOW', '60'))  # segundos
_RATE_MAX = int(os.environ.get('LEAD_RATE_MAX', '30'))  # requisições por janela


def _allow_request(ip: str | None) -> bool:
    if not ip:
        return True
    now = time.time()
    bucket = _RATE_BUCKET.setdefault(ip, [])
    cutoff = now - _RATE_WINDOW
    bucket = [t for t in bucket if t >= cutoff]
    if len(bucket) >= _RATE_MAX:
        _RATE_BUCKET[ip] = bucket
        return False
    bucket.append(now)
    _RATE_BUCKET[ip] = bucket
    return True


@csrf_exempt
def create_lead(request):
    # CORS básico para dev (em produção usar corsheaders)
    if request.method == 'OPTIONS':
        resp = HttpResponse()
        if settings.DEBUG:
            resp['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp['Access-Control-Allow-Headers'] = 'Content-Type'
        return resp

    if request.method != 'POST':
        return HttpResponseBadRequest('invalid_method')

    try:
        data = json.loads(request.body.decode('utf-8')) if request.body else {}
    except Exception:
        data = request.POST.dict()

    # Campos mínimos
    nome = (data.get('nome') or '').strip()
    whats = (data.get('whats') or '').strip()
    cidade = (data.get('cidade') or '').strip()
    valor_conta = data.get('valor_conta')
    consent = bool(data.get('consent')) if 'consent' in data else False
    token = data.get('recaptcha_token') or data.get('token')

    if not (nome and whats and cidade and valor_conta not in (None, '')):
        return JsonResponse({'ok': False, 'error': 'missing_fields'}, status=400)

    # Converter valor_conta (aceita vírgula)
    try:
        valor_conta = round(float(str(valor_conta).replace(',', '.')), 2)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'invalid_valor_conta'}, status=400)

    # Faixa razoável
    if not (0 <= valor_conta <= 200000):
        return JsonResponse({'ok': False, 'error': 'valor_conta_out_of_range'}, status=400)

    # Normaliza telefone
    whats_digits = re.sub(r'\D+', '', whats)
    if len(whats_digits) < 10 or len(whats_digits) > 13:
        return JsonResponse({'ok': False, 'error': 'invalid_whats'}, status=400)

    # Nome/Cidade tamanho mínimo
    if len(nome) < 2 or len(cidade) < 2:
        return JsonResponse({'ok': False, 'error': 'invalid_name_or_city'}, status=400)

    # reCAPTCHA
    recaptcha_score = None
    if token:
        ok, score, details = _verify_recaptcha(token, _get_client_ip(request))
        if not ok or (score is not None and score < 0.5):
            resp = JsonResponse({'ok': False, 'error': 'recaptcha_failed', 'details': details}, status=403)
            if settings.DEBUG:
                resp['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            return resp
        recaptcha_score = score
    else:
        if not settings.DEBUG:
            return JsonResponse({'ok': False, 'error': 'recaptcha_required'}, status=400)

    # Rate limit
    ip = _get_client_ip(request)
    if not _allow_request(ip):
        resp = JsonResponse({'ok': False, 'error': 'rate_limited'}, status=429)
        if settings.DEBUG:
            resp['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        return resp

    lead = Lead.objects.create(
        nome=nome,
        whats=whats_digits,
        cidade=cidade,
        valor_conta=valor_conta,
        consent=consent,
        recaptcha_score=recaptcha_score,
        ip=ip,
        user_agent=(request.META.get('HTTP_USER_AGENT') or '')[:500],
    )

    resp = JsonResponse({'ok': True, 'id': lead.pk})
    if settings.DEBUG:
        resp['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    return resp

