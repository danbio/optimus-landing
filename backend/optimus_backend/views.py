import json
import os
import urllib.request

from django.conf import settings
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def recaptcha_verify(request):
    # CORS básico para dev (em produção use corsheaders)
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

    token = data.get('recaptcha_token') or data.get('token')
    action = data.get('action', 'submit')
    remoteip = request.META.get('REMOTE_ADDR')

    secret = getattr(settings, 'RECAPTCHA_SECRET', '') or os.environ.get('RECAPTCHA_SECRET', '')
    if not secret or not token:
        return JsonResponse({'ok': False, 'error': 'missing_secret_or_token'}, status=400)

    verify_url = 'https://www.google.com/recaptcha/api/siteverify'
    params = f'secret={secret}&response={token}&remoteip={remoteip}'
    req = urllib.request.Request(
        verify_url,
        data=params.encode('utf-8'),
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return JsonResponse({'ok': False, 'error': 'recaptcha_request_failed', 'details': str(e)}, status=502)

    success = result.get('success') is True
    score = float(result.get('score', 0))
    result_action = result.get('action')

    if success and score >= 0.5 and (result_action in (None, action)):
        resp = JsonResponse({'ok': True, 'score': score})
        if settings.DEBUG:
            resp['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        return resp
    else:
        resp = JsonResponse({'ok': False, 'error': 'recaptcha_failed', 'details': result}, status=403)
        if settings.DEBUG:
            resp['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        return resp

