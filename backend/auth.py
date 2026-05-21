"""Autenticacao e decorators para o Painel Aviator
Mudancas em relacao a versao antiga:
  - cliente_required: redirect seguro (nao injeta token cru na URL)
  - resto identico a versao original
"""
from functools import wraps
from flask import session, redirect
from database import verificar_master, verificar_cliente
from database import get_cliente_por_id, atualizar_online


def login_master(email, senha):
    """Autentica o master e cria sessao"""
    master = verificar_master(email, senha)
    if master:
        session.clear()
        session['tipo'] = 'master'
        session['master_id'] = master['id']
        session['master_email'] = master['email']
        session.permanent = True
        return True
    return False


def login_cliente(login, senha):
    """Autentica um cliente e cria sessao"""
    cliente, erro = verificar_cliente(login, senha)
    if cliente:
        session.clear()
        session['tipo'] = 'cliente'
        session['cliente_id'] = cliente['id']
        session['cliente_token'] = cliente['token']
        session.permanent = True
        atualizar_online(cliente['id'], True)
        return True, None
    return False, erro


def logout():
    """Desloga qualquer tipo de usuario"""
    if session.get('tipo') == 'cliente' and session.get('cliente_id'):
        atualizar_online(session['cliente_id'], False)
    session.clear()


def master_required(f):
    """Decorator: so master pode acessar"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('tipo') != 'master':
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated


def cliente_required(f):
    """Decorator: so cliente autenticado pode acessar"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = kwargs.get('token', '')
        # Redirect seguro: so usa o token se for de um cliente que existe
        def voltar_login():
            cliente_existe = get_cliente_por_id(session.get('cliente_id')) \
                if session.get('cliente_id') else None
            if cliente_existe and cliente_existe['token'] == token:
                return redirect(f"/painel/{token}")
            return redirect('/login')

        if session.get('tipo') != 'cliente':
            return voltar_login()

        cliente = get_cliente_por_id(session.get('cliente_id'))
        if not cliente or cliente['bloqueado']:
            logout()
            return voltar_login()
        return f(*args, **kwargs)
    return decorated
