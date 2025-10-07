import json
import os
import urllib.request

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


@csrf_exempt
def create_lead(request):
    # CORS básico para dev
    if request.method == 'OPTIONS':
        resp = HttpResponse()
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

    # Tenta converter valor_conta
    try:
        valor_conta = round(float(valor_conta), 2)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'invalid_valor_conta'}, status=400)

    # reCAPTCHA: se houver token, valida. Se não houver, em DEBUG aceita, em produção exige.
    recaptcha_score = None
    if token:
        ok, score, details = _verify_recaptcha(token, request.META.get('REMOTE_ADDR'))
        if not ok or (score is not None and score < 0.5):
            resp = JsonResponse({'ok': False, 'error': 'recaptcha_failed', 'details': details}, status=403)
            resp['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
            return resp
        recaptcha_score = score
    else:
        if not settings.DEBUG:
            return JsonResponse({'ok': False, 'error': 'recaptcha_required'}, status=400)

    lead = Lead.objects.create(
        nome=nome,
        whats=whats,
        cidade=cidade,
        valor_conta=valor_conta,
        consent=consent,
        recaptcha_score=recaptcha_score,
        ip=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT'),
    )

    resp = JsonResponse({'ok': True, 'id': lead.pk})
    resp['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    return resp
