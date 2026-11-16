#!/usr/bin/env python3
"""Lê os resultados do k6 (CSV) e gera os gráficos (PNG) e as tabelas da página docs/SLA.md.

Uso, na raiz do repositório:
    python tests/k6/sla/graficos.py 1     # medição 1 (o sistema como está)
    python tests/k6/sla/graficos.py 2     # medição 2 (depois das otimizações, comparando com a 1)

Opções: --entrada (pasta com <servico>.csv.gz, padrão sla-saida) e --docs (padrão docs).

Os gráficos vão para docs/sla/medicao-N/, junto com os números em CSV e um resumo.json, que a medição 2
usa para comparar com a 1. Na página, só o que fica entre os marcadores <!-- ... --> é reescrito:
o texto escrito à mão (hipóteses, otimizações) não é tocado.

Precisa do matplotlib: pip install matplotlib
"""

import argparse
from array import array
import csv
import gzip
import json
import os
import platform
import re
import subprocess
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs
from zoneinfo import ZoneInfo

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

SERVICOS = [
    {"id": "busca-trilhas", "nome": "Busca no catálogo de trilhas", "meta_p95": 500, "cor": "#2563eb"},
    {"id": "visitas", "nome": "Planejar e cancelar visita", "meta_p95": 500, "cor": "#dc2626"},
    {"id": "login", "nome": "Login", "meta_p95": 1000, "cor": "#16a34a"},
]
METRICAS = {"http_req_duration", "http_req_failed", "http_req_blocked"}
COR_VUS = "#6b7280"
COR_P95 = "#f59e0b"
FUSO = ZoneInfo("America/Sao_Paulo")


# ---------- leitura do CSV do k6 ----------


def ler_resultados(arquivo):
    # Um teste rápido gera dezenas de milhões de linhas: os valores vão para array (8 bytes cada, não um objeto
    # Python por número) e os textos que se repetem (endpoint, status, tags) viram códigos.
    abrir = gzip.open if arquivo.suffix == ".gz" else open
    dados = {m: {"ts": array("d"), "valor": array("d"), "degrau": array("i"), "patamar": bytearray(),
                 "nome": array("i"), "status": array("i")} for m in METRICAS}
    vus_ts, vus_valor = array("d"), array("d")
    textos, codigos = [], {}
    tags = {}

    def codigo(texto):
        c = codigos.get(texto)
        if c is None:
            c = codigos[texto] = len(textos)
            textos.append(texto)
        return c

    with abrir(arquivo, "rt", newline="", encoding="utf-8") as f:
        leitor = csv.reader(f)
        col = {nome: i for i, nome in enumerate(next(leitor))}
        i_metrica, i_ts, i_valor = col["metric_name"], col["timestamp"], col["metric_value"]
        i_extras, i_nome, i_status = col["extra_tags"], col.get("name"), col.get("status")

        for linha in leitor:
            metrica = linha[i_metrica]
            if metrica == "vus":
                vus_ts.append(float(linha[i_ts]))
                vus_valor.append(float(linha[i_valor]))
                continue
            if metrica not in METRICAS:
                continue
            bruto = linha[i_extras]
            extras = tags.get(bruto)
            if extras is None:
                q = parse_qs(bruto)
                extras = tags[bruto] = (int(q.get("degrau", ["0"])[0]), q["fase"][0] == "patamar") if "fase" in q else None
            if extras is None:  # requisições do setup (cadastro de usuários etc.) não contam
                continue
            d = dados[metrica]
            d["ts"].append(float(linha[i_ts]))
            d["valor"].append(float(linha[i_valor]))
            d["degrau"].append(extras[0])
            d["patamar"].append(extras[1])
            d["nome"].append(codigo(linha[i_nome] if i_nome is not None else ""))
            d["status"].append(codigo(linha[i_status] if i_status is not None else ""))

    tabela = np.array(textos, dtype=object)
    arrays = {}
    for m, d in dados.items():
        ts = np.frombuffer(d["ts"], dtype=float).copy()
        if len(ts) and ts.max() < 1e11:  # CSV com segundos em vez de milissegundos
            ts *= 1000
        arrays[m] = {
            "ts": ts,
            "valor": np.frombuffer(d["valor"], dtype=float).copy(),
            "degrau": np.frombuffer(d["degrau"], dtype=np.int32).astype(int),
            "patamar": np.frombuffer(bytes(d["patamar"]), dtype=np.uint8).astype(bool),
            "nome": tabela[np.frombuffer(d["nome"], dtype=np.int32)],
            "status": tabela[np.frombuffer(d["status"], dtype=np.int32)],
        }
    vts = np.frombuffer(vus_ts, dtype=float).copy()
    if len(vts) and vts.max() < 1e11:
        vts *= 1000
    arrays["vus"] = {"ts": vts, "valor": np.array(vus_valor)}
    return arrays


# ---------- estatística ----------


def resumo_estatistico(valores):
    if not len(valores):
        return dict.fromkeys(["media", "mediana", "min", "max", "p95", "p99"], 0.0)
    return {
        "media": float(np.mean(valores)),
        "mediana": float(np.median(valores)),
        "min": float(np.min(valores)),
        "max": float(np.max(valores)),
        "p95": float(np.percentile(valores, 95)),
        "p99": float(np.percentile(valores, 99)),
    }


def por_segundo(dur, falhas, bloqueio, vus):
    """Séries segundo a segundo, contadas a partir da primeira requisição medida."""
    t0 = dur["ts"].min()
    seg = ((dur["ts"] - t0) // 1000).astype(int)
    n = seg.max() + 1
    qtd = np.bincount(seg, minlength=n)
    soma = np.bincount(seg, weights=dur["valor"], minlength=n)

    ordem = np.lexsort((dur["valor"], seg))
    grupos = np.split(dur["valor"][ordem], np.cumsum(qtd)[:-1])
    p95 = np.array([np.percentile(g, 95) if len(g) else np.nan for g in grupos])

    seg_f = ((falhas["ts"] - t0) // 1000).astype(int)
    validos = (seg_f >= 0) & (seg_f < n)
    qtd_f = np.bincount(seg_f[validos], minlength=n)
    soma_f = np.bincount(seg_f[validos], weights=falhas["valor"][validos], minlength=n)

    seg_b = ((bloqueio["ts"] - t0) // 1000).astype(int)
    validos = (seg_b >= 0) & (seg_b < n)
    qtd_b = np.bincount(seg_b[validos], minlength=n)
    soma_b = np.bincount(seg_b[validos], weights=bloqueio["valor"][validos], minlength=n)

    # com a CPU no limite, o k6 às vezes pula a amostra de VUs de um segundo: repete a anterior
    vus_seg = np.full(n, np.nan)
    seg_v = ((vus["ts"] - t0) // 1000).astype(int)
    for s, v in zip(seg_v, vus["valor"]):
        if 0 <= s < n:
            vus_seg[s] = v if np.isnan(vus_seg[s]) else max(vus_seg[s], v)
    ultimo = 0.0
    for i in range(n):
        if np.isnan(vus_seg[i]):
            vus_seg[i] = ultimo
        ultimo = vus_seg[i]

    with np.errstate(invalid="ignore", divide="ignore"):
        serie = {
            "segundo": np.arange(n),
            "latencia_media": np.where(qtd > 0, soma / qtd, np.nan),
            "p95": p95,
            "vazao": qtd.astype(float),
            "erros": np.where(qtd_f > 0, 100 * soma_f / qtd_f, 0.0),
            "bloqueio": np.where(qtd_b > 0, soma_b / qtd_b, np.nan),
            "vus": vus_seg,
        }
    # o último segundo é parcial e puxaria a vazão para baixo
    return {k: v[:-1] for k, v in serie.items()} if n > 1 else serie


def analisar(brutos, servico):
    dur, falhas, bloqueio = brutos["http_req_duration"], brutos["http_req_failed"], brutos["http_req_blocked"]
    if not len(dur["ts"]):
        return None

    degraus = []
    for vus in sorted(set(dur["degrau"][dur["patamar"]].tolist())):
        sel = dur["patamar"] & (dur["degrau"] == vus)
        valores = dur["valor"][sel]
        duracao_s = max(1.0, (dur["ts"][sel].max() - dur["ts"][sel].min()) / 1000)
        sel_f = falhas["patamar"] & (falhas["degrau"] == vus)
        sel_b = bloqueio["patamar"] & (bloqueio["degrau"] == vus)
        por_endpoint = {}
        for nome in sorted(set(dur["nome"][sel].tolist())):
            por_endpoint[nome] = float(np.mean(valores[dur["nome"][sel] == nome]))
        est = resumo_estatistico(valores)
        degraus.append(
            {
                "vus": vus,
                "requisicoes": int(sel.sum()),
                "latencia_media": est["media"],
                "p95": est["p95"],
                "p99": est["p99"],
                "max": est["max"],
                "vazao": len(valores) / duracao_s,
                "erros": float(100 * falhas["valor"][sel_f].mean()) if sel_f.any() else 0.0,
                "bloqueio_medio": float(bloqueio["valor"][sel_b].mean()) if sel_b.any() else 0.0,
                "por_endpoint": por_endpoint,
            }
        )
    for d in degraus:
        d["dentro_sla"] = d["erros"] < 1 and d["p95"] <= servico["meta_p95"]

    # limite de concorrência: maior degrau, antes da primeira falha, com erros < 1% e p95 dentro da meta
    limite, primeiro_estouro = None, None
    for d in degraus:
        if d["dentro_sla"]:
            limite = d["vus"]
        else:
            primeiro_estouro = d["vus"]
            break

    falhou = falhas["valor"] > 0
    status_erros = Counter(falhas["status"][falhou].tolist())

    return {
        "degraus": degraus,
        "limite": limite,
        "primeiro_estouro": primeiro_estouro,
        "geral": {
            "requisicoes": int(len(dur["valor"])),
            "erros": float(100 * falhas["valor"].mean()) if len(falhas["valor"]) else 0.0,
            "latencia": resumo_estatistico(dur["valor"]),
            "bloqueio": resumo_estatistico(bloqueio["valor"]),
        },
        "status_erros": dict(status_erros),
        "serie": por_segundo(dur, falhas, bloqueio, brutos["vus"]),
    }


# ---------- formatação ----------


def num(x, casas=2):
    if x is None or (isinstance(x, float) and not np.isfinite(x)):
        return "–"
    texto = f"{x:,.{casas}f}"
    return texto.replace(",", "X").replace(".", ",").replace("X", ".")


def inteiro(x):
    return f"{int(x):,}".replace(",", ".")


def variacao(antes, depois):
    if not antes:
        return "–"
    v = 100 * (depois - antes) / antes
    return f"{'+' if v >= 0 else ''}{num(v, 1)}%"


def descricao_status(status):
    if status in ("", "0"):
        return "sem resposta (timeout ou conexão recusada)"
    return f"HTTP {status}"


# ---------- gráficos ----------


def novo_grafico(titulo, rotulo_y, largura=10, altura=4):
    fig, ax = plt.subplots(figsize=(largura, altura), dpi=110)
    ax.set_title(titulo, fontsize=12)
    ax.set_ylabel(rotulo_y)
    ax.grid(True, alpha=0.3)
    return fig, ax


def eixo_vus(ax, serie):
    ax2 = ax.twinx()
    ax2.step(serie["segundo"], serie["vus"], where="post", color=COR_VUS, linestyle="--", linewidth=1, label="VUs")
    ax2.set_ylabel("usuários simultâneos (VUs)", color=COR_VUS)
    ax2.tick_params(axis="y", colors=COR_VUS)
    ax2.set_ylim(0, max(1, serie["vus"].max()) * 1.15)
    return ax2


def salvar(fig, arquivo, *eixos):
    linhas, rotulos = [], []
    for ax in eixos:
        l, r = ax.get_legend_handles_labels()
        linhas += l
        rotulos += r
    if linhas:
        eixos[0].legend(linhas, rotulos, loc="upper left", fontsize=9)
    fig.tight_layout()
    fig.savefig(arquivo)
    plt.close(fig)


def graficos_servico(s, r, pasta):
    serie = r["serie"]
    x = serie["segundo"]
    nome = s["nome"]

    fig, ax = novo_grafico(f"Latência de {nome}", "tempo de resposta (ms)")
    ax.plot(x, serie["latencia_media"], color=s["cor"], linewidth=1.2, label="média")
    ax.plot(x, serie["p95"], color=COR_P95, linewidth=1, alpha=0.8, label="p95")
    ax.axhline(s["meta_p95"], color="#991b1b", linestyle=":", linewidth=1, label=f"meta do p95 ({s['meta_p95']} ms)")
    ax.set_xlabel("tempo de teste (s)")
    ax.set_ylim(bottom=0)
    salvar(fig, pasta / f"{s['id']}-latencia.png", ax, eixo_vus(ax, serie))

    fig, ax = novo_grafico(f"Vazão de {nome}", "requisições por segundo")
    ax.plot(x, serie["vazao"], color=s["cor"], linewidth=1.2, label="req/s")
    ax.set_xlabel("tempo de teste (s)")
    ax.set_ylim(bottom=0)
    salvar(fig, pasta / f"{s['id']}-vazao.png", ax, eixo_vus(ax, serie))

    fig, ax = novo_grafico(f"Erros de {nome}", "requisições com erro (%)")
    ax.fill_between(x, serie["erros"], color="#dc2626", alpha=0.35, step="post")
    ax.plot(x, serie["erros"], color="#dc2626", linewidth=1, drawstyle="steps-post", label="% de erros")
    ax.axhline(1, color="#991b1b", linestyle=":", linewidth=1, label="limite do SLA (1%)")
    ax.set_xlabel("tempo de teste (s)")
    ax.set_ylim(0, max(5, float(np.nanmax(serie["erros"])) * 1.1))
    salvar(fig, pasta / f"{s['id']}-erros.png", ax, eixo_vus(ax, serie))

    fig, ax = novo_grafico(f"Tempo bloqueado de {nome}", "http_req_blocked médio (ms)")
    ax.plot(x, serie["bloqueio"], color="#7c3aed", linewidth=1.2, label="tempo bloqueado")
    ax.set_xlabel("tempo de teste (s)")
    ax.set_ylim(bottom=0)
    salvar(fig, pasta / f"{s['id']}-bloqueio.png", ax, eixo_vus(ax, serie))

    degraus = r["degraus"]
    rotulos = [str(d["vus"]) for d in degraus]
    pos = np.arange(len(degraus))
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4), dpi=110)
    a1.bar(pos - 0.2, [d["latencia_media"] for d in degraus], 0.4, color=s["cor"], label="média")
    a1.bar(pos + 0.2, [d["p95"] for d in degraus], 0.4, color=COR_P95, label="p95")
    a1.axhline(s["meta_p95"], color="#991b1b", linestyle=":", linewidth=1, label=f"meta ({s['meta_p95']} ms)")
    a1.set_title("Latência por patamar", fontsize=12)
    a1.set_ylabel("ms")
    a2.bar(pos, [d["vazao"] for d in degraus], 0.6, color=s["cor"])
    a2.set_title("Vazão por patamar", fontsize=12)
    a2.set_ylabel("req/s")
    for a in (a1, a2):
        a.set_xticks(pos, rotulos)
        a.set_xlabel("usuários simultâneos (VUs)")
        a.grid(True, axis="y", alpha=0.3)
    a1.legend(fontsize=9)
    fig.suptitle(nome, fontsize=13)
    fig.tight_layout()
    fig.savefig(pasta / f"{s['id']}-patamares.png")
    plt.close(fig)


def grafico_comparacao_servicos(resultados, arquivo):
    fig, eixos = plt.subplots(2, 2, figsize=(11, 7.5), dpi=110)
    campos = [
        ("latencia_media", "Latência média (ms)"),
        ("p95", "p95 (ms)"),
        ("vazao", "Vazão (req/s)"),
        ("erros", "Erros (%)"),
    ]
    for ax, (campo, titulo) in zip(eixos.flat, campos):
        for s, r in resultados:
            ax.plot([d["vus"] for d in r["degraus"]], [d[campo] for d in r["degraus"]], marker="o", color=s["cor"], label=s["nome"])
        ax.set_title(titulo, fontsize=11)
        ax.set_xlabel("usuários simultâneos (VUs)")
        ax.set_ylim(bottom=0)
        ax.grid(True, alpha=0.3)
    eixos[0, 0].legend(fontsize=9)
    fig.suptitle("Comparação entre os serviços (média de cada patamar)", fontsize=13)
    fig.tight_layout()
    fig.savefig(arquivo)
    plt.close(fig)


def grafico_antes_depois(s, antes, depois, arquivo):
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4), dpi=110)
    for res, rotulo, estilo in ((antes, "medição 1", "--"), (depois, "medição 2", "-")):
        vus = [d["vus"] for d in res["degraus"]]
        a1.plot(vus, [d["p95"] for d in res["degraus"]], estilo, marker="o", color=s["cor"], label=rotulo)
        a2.plot(vus, [d["vazao"] for d in res["degraus"]], estilo, marker="o", color=s["cor"], label=rotulo)
    a1.axhline(s["meta_p95"], color="#991b1b", linestyle=":", linewidth=1, label=f"meta ({s['meta_p95']} ms)")
    a1.set_title("p95 por patamar (ms)", fontsize=12)
    a2.set_title("Vazão por patamar (req/s)", fontsize=12)
    for a in (a1, a2):
        a.set_xlabel("usuários simultâneos (VUs)")
        a.set_ylim(bottom=0)
        a.grid(True, alpha=0.3)
        a.legend(fontsize=9)
    fig.suptitle(f"{s['nome']}: medição 1 × medição 2", fontsize=13)
    fig.tight_layout()
    fig.savefig(arquivo)
    plt.close(fig)


# ---------- textos ----------


def texto_limite(r, s):
    criterio = f"(p95 ≤ {s['meta_p95']} ms e erros < 1%)"
    if r["limite"] is None:
        return f"{criterio}: o SLA já não vale no primeiro patamar ({r['degraus'][0]['vus']} VUs)"
    if r["primeiro_estouro"] is None:
        return f"{criterio}: o SLA valeu em todos os patamares, até **{r['limite']} VUs** (o limite real fica acima disso)"
    return f"{criterio}: **{r['limite']} VUs** (com {r['primeiro_estouro']} VUs o SLA deixou de valer)"


def o_que_mostrou(r, s):
    degraus = r["degraus"]
    a, z = degraus[0], degraus[-1]
    out = [
        f"De {a['vus']} para {z['vus']} VUs, a latência média foi de {num(a['latencia_media'])} ms para "
        f"{num(z['latencia_media'])} ms, o p95 de {num(a['p95'])} ms para {num(z['p95'])} ms e a vazão de "
        f"{num(a['vazao'], 1)} para {num(z['vazao'], 1)} req/s."
    ]
    maxima = max(degraus, key=lambda d: d["vazao"])
    saturou = next(d for d in degraus if d["vazao"] >= 0.9 * maxima["vazao"])
    if maxima["vus"] < z["vus"] and z["vazao"] < 0.8 * maxima["vazao"]:
        out.append(
            f"A vazão foi máxima com {maxima['vus']} VUs ({num(maxima['vazao'], 1)} req/s) e depois caiu para "
            f"{num(z['vazao'], 1)} req/s com {z['vus']} VUs: além de fazer fila, o serviço ficou mais lento ao longo do teste "
            "(veja o gráfico de vazão no tempo)."
        )
    elif saturou["vus"] < z["vus"]:
        out.append(
            f"A vazão chegou a 90% do máximo ({num(maxima['vazao'], 1)} req/s) já com {saturou['vus']} VUs. "
            "Daí em diante, mais usuários só aumentaram o tempo de espera: algum recurso (CPU, conexões com o banco "
            "ou threads) está no limite e as requisições fazem fila."
        )
    else:
        out.append("A vazão acompanhou o número de VUs até o último patamar: o limite do serviço fica acima da maior carga testada.")
    if r["primeiro_estouro"] is not None:
        d = next(d for d in degraus if d["vus"] == r["primeiro_estouro"])
        motivo = []
        if d["p95"] > s["meta_p95"]:
            motivo.append(f"p95 de {num(d['p95'])} ms")
        if d["erros"] >= 1:
            motivo.append(f"{num(d['erros'])}% de erros")
        out.append(f"O SLA deixou de valer com {d['vus']} VUs ({' e '.join(motivo)}).")
    else:
        out.append("O SLA foi cumprido em todos os patamares.")
    if r["status_erros"]:
        partes = [f"{descricao_status(st)}: {inteiro(n)}" for st, n in sorted(r["status_erros"].items(), key=lambda x: -x[1])]
        out.append(f"Requisições com erro, por tipo: {'; '.join(partes)}.")
    else:
        out.append("Nenhuma requisição falhou.")
    return out


def resumo_ambiente(amb):
    partes = [amb.get("cpu"), f"{amb['nucleos']} núcleos lógicos" if amb.get("nucleos") else "", f"{amb['memoria']} de RAM" if amb.get("memoria") else "", amb.get("so")]
    maquina = ", ".join(p for p in partes if p) or "não informado"
    pilha = " · ".join(p for p in (amb.get("java"), amb.get("mysql"), amb.get("k6")) if p)
    onde = amb.get("origem") or "computador local"
    return f"{onde}: {maquina}. Backend (Spring Boot), banco e gerador de carga na mesma máquina, sem containers ({pilha})"


def bloco_medicao(s, r, n, data_br, amb):
    pasta = f"sla/medicao-{n}"
    L = [
        f"- **Data da medição:** {data_br}",
        f"- **Descrição das configurações:** {resumo_ambiente(amb)}. Detalhes em [Configuração do ambiente](#configuração-do-ambiente).",
        "",
        "#### Testes de carga (SLA): latência, vazão e concorrência",
        "",
        f"- **Requisições no teste:** {inteiro(r['geral']['requisicoes'])}",
        f"- **Limite de concorrência dentro do SLA** {texto_limite(r, s)}",
        "",
        "| Concorrência (VUs) | Requisições | Latência média (ms) | p95 (ms) | p99 (ms) | Vazão (req/s) | Erros (%) | SLA |",
        "| ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---: |",
    ]
    for d in r["degraus"]:
        L.append(
            f"| {d['vus']} | {inteiro(d['requisicoes'])} | {num(d['latencia_media'])} | {num(d['p95'])} | {num(d['p99'])} | "
            f"{num(d['vazao'], 1)} | {num(d['erros'])} | {'✅' if d['dentro_sla'] else '❌'} |"
        )
    L += [
        "",
        "| Métrica (teste inteiro) | Média | Mediana | Mín | Máx | P95 | P99 |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for rotulo, chave in (("Latência, `http_req_duration` (ms)", "latencia"), ("Tempo bloqueado, `http_req_blocked` (ms)", "bloqueio")):
        e = r["geral"][chave]
        L.append(f"| {rotulo} | {num(e['media'])} | {num(e['mediana'])} | {num(e['min'])} | {num(e['max'])} | {num(e['p95'])} | {num(e['p99'])} |")

    endpoints = list(r["degraus"][0]["por_endpoint"]) if r["degraus"] else []
    if len(endpoints) > 1:
        L += ["", "Latência média por endpoint (ms):", ""]
        L.append(f"| Concorrência (VUs) | {' | '.join(f'`{e}`' for e in endpoints)} |")
        L.append(f"| ---: | {' | '.join('---:' for _ in endpoints)} |")
        for d in r["degraus"]:
            L.append(f"| {d['vus']} | {' | '.join(num(d['por_endpoint'].get(e, float('nan'))) for e in endpoints)} |")

    L.append("")
    for sufixo, titulo in (("patamares", "Latência e vazão por patamar"), ("latencia", "Latência"), ("vazao", "Vazão"), ("erros", "Erros"), ("bloqueio", "Tempo bloqueado")):
        L.append(f"![{titulo} de {s['nome']}]({pasta}/{s['id']}-{sufixo}.png)")
    L += ["", "**Resumo dos números**", ""]
    L += [f"- {t}" for t in o_que_mostrou(r, s)]
    L.append(f"- Números completos: [`{s['id']}-patamares.csv`]({pasta}/{s['id']}-patamares.csv) e [`{s['id']}-por-segundo.csv`]({pasta}/{s['id']}-por-segundo.csv).")
    return "\n".join(L)


def bloco_antes_depois(s, antes, depois, n):
    L = [
        "| Concorrência (VUs) | Latência média 1 → 2 (ms) | p95 1 → 2 (ms) | Vazão 1 → 2 (req/s) | Erros 1 → 2 (%) |",
        "| ---: | ---: | ---: | ---: | ---: |",
    ]
    por_vus = {d["vus"]: d for d in antes["degraus"]}
    for d in depois["degraus"]:
        a = por_vus.get(d["vus"])
        if not a:
            continue
        L.append(
            f"| {d['vus']} | {num(a['latencia_media'])} → {num(d['latencia_media'])} ({variacao(a['latencia_media'], d['latencia_media'])}) | "
            f"{num(a['p95'])} → {num(d['p95'])} ({variacao(a['p95'], d['p95'])}) | "
            f"{num(a['vazao'], 1)} → {num(d['vazao'], 1)} ({variacao(a['vazao'], d['vazao'])}) | "
            f"{num(a['erros'])} → {num(d['erros'])} |"
        )
    lim = lambda r: f"{r['limite']} VUs" if r["limite"] is not None else f"abaixo de {r['degraus'][0]['vus']} VUs"  # noqa: E731
    L += [
        "",
        f"- **Limite de concorrência dentro do SLA:** {lim(antes)} na medição 1 → {lim(depois)} na medição 2.",
        f"- **Latência média do teste inteiro:** {num(antes['geral']['latencia']['media'])} ms → {num(depois['geral']['latencia']['media'])} ms "
        f"({variacao(antes['geral']['latencia']['media'], depois['geral']['latencia']['media'])}).",
        "",
        f"![{s['nome']}: medição 1 × medição 2](sla/medicao-{n}/{s['id']}-comparacao.png)",
    ]
    return "\n".join(L)


def bloco_servicos(resultados, n):
    L = [
        "| Serviço | Requisições | Latência média (ms) | p95 (ms) | Vazão máxima (req/s) | Limite de concorrência no SLA | Erros (%) |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for s, r in resultados:
        maxima = max(r["degraus"], key=lambda d: d["vazao"])
        limite = f"{r['limite']} VUs" if r["limite"] is not None else f"< {r['degraus'][0]['vus']} VUs"
        L.append(
            f"| {s['nome']} | {inteiro(r['geral']['requisicoes'])} | {num(r['geral']['latencia']['media'])} | {num(r['geral']['latencia']['p95'])} | "
            f"{num(maxima['vazao'], 1)} (com {maxima['vus']} VUs) | {limite} | {num(r['geral']['erros'])} |"
        )
    L += ["", f"![Comparação entre os serviços](sla/medicao-{n}/comparacao-servicos.png)"]
    return "\n".join(L)


# ---------- ambiente ----------


def rodar(*cmd):
    try:
        saida = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        return (saida.stdout or saida.stderr).strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def detectar_ambiente(entrada):
    amb = {}
    if platform.system() == "Windows":
        ps = lambda c: rodar("powershell", "-NoProfile", "-Command", c)  # noqa: E731
        amb["so"] = ps("(Get-CimInstance Win32_OperatingSystem).Caption")
        amb["cpu"] = ps("(Get-CimInstance Win32_Processor | Select-Object -First 1).Name")
        mem = ps("(Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum")
        amb["memoria"] = f"{round(int(mem) / 1024**3)} GB" if mem.isdigit() else ""
    else:
        amb["so"] = platform.platform()
        try:
            amb["cpu"] = next(l.split(":", 1)[1].strip() for l in open("/proc/cpuinfo") if l.startswith("model name"))
            kb = next(int(l.split()[1]) for l in open("/proc/meminfo") if l.startswith("MemTotal"))
            amb["memoria"] = f"{round(kb / 1024**2)} GB"
        except (OSError, StopIteration):
            pass
    amb["nucleos"] = str(os.cpu_count() or "")
    versao = lambda texto: (re.search(r"\d+\.\d+\.\d+", texto) or re.search(r"\d+", texto) or [""])[0]  # noqa: E731
    k6 = rodar("k6", "version")
    amb["k6"] = f"k6 v{versao(k6)}" if k6 else ""
    java = rodar("java", "-version")
    amb["java"] = f"Java {versao(java)}" if java else ""
    mysql = ["mysql"] + sorted(str(p) for p in Path(os.environ.get("ProgramFiles", "C:/Program Files")).glob("MySQL/MySQL Server */bin/mysql.exe"))
    for exe in mysql:
        saida = rodar(exe, "--version")
        if saida:
            amb["mysql"] = f"MySQL {versao(saida.split('Ver', 1)[-1])}"
            break
    arquivo = entrada / "ambiente.json"
    if arquivo.exists():
        amb.update({k: v for k, v in json.loads(arquivo.read_text(encoding="utf-8")).items() if v})
    return amb


def bloco_ambiente(amb):
    v = lambda k: amb.get(k) or "não informado"  # noqa: E731
    origem = v("origem") if amb.get("origem") else "computador local"
    if amb.get("execucaoUrl"):
        origem += f" ([execução]({amb['execucaoUrl']}))"
    degraus = amb.get("degraus") or os.environ.get("DEGRAUS") or "10, 25, 50, 100, 150, 200"
    subida = amb.get("subida") or os.environ.get("SUBIDA") or "10"
    patamar = amb.get("patamar") or os.environ.get("PATAMAR") or "50"
    return "\n".join(
        [
            "| Item | Valor |",
            "| --- | --- |",
            f"| Onde rodou | {origem} |",
            f"| Computador | {v('cpu')} ({v('nucleos')} núcleos lógicos) · {v('memoria')} de RAM |",
            f"| Sistema operacional | {v('so')} |",
            f"| Back-end | Spring Boot 3.3 (jar) em {v('java')}, Tomcat embutido (padrão: até 200 threads) e pool HikariCP (padrão: 10 conexões) |",
            f"| Banco de dados | {v('mysql')} |",
            f"| Gerador de carga | {v('k6')}, na mesma máquina, em `http://localhost:8080` |",
            f"| Perfil de carga | patamares de {degraus} VUs; {subida} s de subida e {patamar} s parado em cada |",
        ]
    )


# ---------- página ----------


def substituir(pagina, chave, conteudo):
    padrao = re.compile(rf"(<!-- {re.escape(chave)} -->)(.*?)(<!-- /{re.escape(chave)} -->)", re.S)
    if not padrao.search(pagina):
        print(f"aviso: marcador <!-- {chave} --> não encontrado em SLA.md", file=sys.stderr)
        return pagina
    return padrao.sub(lambda m: f"{m.group(1)}\n{conteudo}\n{m.group(3)}", pagina)


def salvar_csv(arquivo, cabecalho, linhas):
    with open(arquivo, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cabecalho)
        w.writerows(linhas)


def para_json(r):
    return {k: v for k, v in r.items() if k != "serie"}


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("medicao", type=int, choices=[1, 2], nargs="?", default=1)
    p.add_argument("--entrada", default="sla-saida")
    p.add_argument("--docs", default="docs")
    args = p.parse_args()

    entrada, docs, n = Path(args.entrada), Path(args.docs), args.medicao
    pasta = docs / "sla" / f"medicao-{n}"
    pasta.mkdir(parents=True, exist_ok=True)
    data_br = datetime.now(FUSO).strftime("%d/%m/%Y")

    resultados = []
    for s in SERVICOS:
        arquivo = next((entrada / f"{s['id']}{ext}" for ext in (".csv.gz", ".csv") if (entrada / f"{s['id']}{ext}").exists()), None)
        if not arquivo:
            print(f"(sem resultados para {s['id']} em {entrada}/, pulando)")
            continue
        print(f"lendo {arquivo} ...")
        r = analisar(ler_resultados(arquivo), s)
        if not r or not r["degraus"]:
            print(f"(resultados de {s['id']} sem dados de patamar, pulando)")
            continue
        resultados.append((s, r))
        graficos_servico(s, r, pasta)
        salvar_csv(
            pasta / f"{s['id']}-patamares.csv",
            ["vus", "requisicoes", "latencia_media_ms", "p95_ms", "p99_ms", "max_ms", "vazao_req_s", "erros_pct", "bloqueio_medio_ms", "dentro_sla"],
            [[d["vus"], d["requisicoes"], f"{d['latencia_media']:.2f}", f"{d['p95']:.2f}", f"{d['p99']:.2f}", f"{d['max']:.2f}",
              f"{d['vazao']:.2f}", f"{d['erros']:.2f}", f"{d['bloqueio_medio']:.2f}", int(d["dentro_sla"])] for d in r["degraus"]],
        )
        se = r["serie"]
        salvar_csv(
            pasta / f"{s['id']}-por-segundo.csv",
            ["segundo", "vus", "requisicoes", "latencia_media_ms", "p95_ms", "erros_pct", "bloqueio_medio_ms"],
            [[int(se["segundo"][i]), int(se["vus"][i]), int(se["vazao"][i]), f"{se['latencia_media'][i]:.2f}", f"{se['p95'][i]:.2f}",
              f"{se['erros'][i]:.2f}", f"{se['bloqueio'][i]:.2f}"] for i in range(len(se["segundo"]))],
        )
        limite = r["limite"] if r["limite"] is not None else f"<{r['degraus'][0]['vus']}"
        print(f"  {s['id']}: {r['geral']['requisicoes']} requisições, limite no SLA: {limite} VUs")

    if not resultados:
        sys.exit(f"Nenhum resultado em {entrada}/. Rode os testes com: k6 run --out csv={entrada}/<servico>.csv.gz ...")

    grafico_comparacao_servicos(resultados, pasta / "comparacao-servicos.png")
    amb = detectar_ambiente(entrada)
    (pasta / "resumo.json").write_text(
        json.dumps({"data": data_br, "ambiente": amb, "servicos": {s["id"]: para_json(r) for s, r in resultados}}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    arquivo_pagina = docs / "SLA.md"
    pagina = arquivo_pagina.read_text(encoding="utf-8")
    pagina = substituir(pagina, "AMBIENTE", bloco_ambiente(amb))
    for s, r in resultados:
        pagina = substituir(pagina, f"MEDICAO{n}:{s['id']}", bloco_medicao(s, r, n, data_br, amb))
    pagina = substituir(pagina, f"SERVICOS:{n}", bloco_servicos(resultados, n))

    resumo_1 = docs / "sla" / "medicao-1" / "resumo.json"
    if n == 2 and resumo_1.exists():
        antes = json.loads(resumo_1.read_text(encoding="utf-8"))["servicos"]
        for s, r in resultados:
            if s["id"] in antes:
                grafico_antes_depois(s, antes[s["id"]], r, pasta / f"{s['id']}-comparacao.png")
                pagina = substituir(pagina, f"COMPARACAO:{s['id']}", bloco_antes_depois(s, antes[s["id"]], r, n))
    elif n == 2:
        print("aviso: docs/sla/medicao-1/resumo.json não existe; a comparação com a medição 1 ficou de fora", file=sys.stderr)

    arquivo_pagina.write_text(pagina, encoding="utf-8")
    print(f"Gráficos em {pasta}/ e página atualizada: {arquivo_pagina}")


if __name__ == "__main__":
    main()
