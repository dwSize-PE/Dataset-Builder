# ⬡ YOLO Dataset Builder

<p align="center">
  <strong>Ferramenta web local para criar datasets de treinamento no formato YOLO</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/OpenCV-4.10-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

---

## 📋 Sobre o Projeto

O **YOLO Dataset Builder** é uma aplicação web local projetada para preparar datasets de imagens e vídeos para treinamento de modelos **YOLOv8/v11**. A ferramenta permite importar mídias, anotar objetos com bounding boxes, gerenciar classes e exportar tudo no formato YOLO pronto para treinar.

### Por que usar?

- **Sem dependência de serviços externos** — tudo roda localmente na sua máquina
- **Escalável para múltiplos projetos** — detecção de pessoas, veículos, animais, etc.
- **Exportação direta para YOLO** — gera `data.yaml` + estrutura `train/val/test` automaticamente
- **Apenas frames anotados são exportados** — carregou 100 frames mas anotou 50? O dataset terá exatamente os 50 anotados

---

<img width="1907" height="912" alt="image" src="https://github.com/user-attachments/assets/9b615713-f571-45e9-a7fc-ff8e07de9905" />

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Upload de imagens e vídeos** | Suporta JPG, PNG, BMP, WebP, MP4, AVI, MKV, MOV, WebM |
| **Extração de frames** | Extrai frames automaticamente ao fazer upload de vídeos |
| **Anotação com bounding boxes** | Desenhe caixas sobre os objetos diretamente no canvas |
| **Multi-classe** | Suporte a múltiplas classes por imagem com cores distintas |
| **Resize e drag de bboxes** | 8 handles de redimensionamento + arraste para reposicionar |
| **Crosshair** | Guia visual em forma de cruz para anotação precisa |
| **Undo (Ctrl+Z)** | Desfaz até 50 ações no canvas |
| **Skip de frames** | Marque frames ruins que não devem ir para o dataset |
| **Exclusão de frames** | Delete frames indesejados (individual ou em lote) |
| **Multi-seleção na timeline** | Ctrl+Click (individual) e Shift+Click (range) para ações em lote |
| **Exportação YOLO** | Split configurável Train/Val/Test com resize opcional |
| **Navegação com skip** | Dropdown configurável para pular N frames por vez (1, 5, 10, 15, 20, 30, 50) |
| **Atalhos de teclado** | Navegação e anotação rápidas sem tirar a mão do teclado |

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|---|---|
| `D` / `→` | Avançar N frames (configurável) |
| `A` / `←` | Voltar N frames (configurável) |
| `X` | Pular frame (marcar como ruim) |
| `B` | Modo caixa (bounding box) |
| `1-9` | Selecionar classe pelo número |
| `Del` | Remover bbox selecionada |
| `Shift+Del` | Excluir frame atual |
| `Ctrl+Z` | Desfazer última ação |
| `Ctrl+S` | Salvar anotação atual |
| `Esc` | Cancelar desenho / desselecionar |
| `H` | Mostrar/ocultar painel de atalhos |

---

## 🏗️ Arquitetura

```
dataset-builder/
├── run.py                          # Entry point (uvicorn)
├── requirements.txt                # Dependências Python
├── README.md
│
├── backend/
│   ├── main.py                     # App FastAPI + rotas estáticas
│   ├── config.py                   # Constantes e configurações
│   ├── models/
│   │   └── schemas.py              # Modelos Pydantic (validação)
│   ├── routers/
│   │   ├── projects.py             # CRUD de projetos
│   │   ├── media.py                # Upload de mídia + listagem de frames
│   │   ├── annotations.py          # Salvar/carregar anotações
│   │   └── export.py               # Exportação YOLO
│   └── services/
│       ├── video_processor.py      # Extração de frames com OpenCV
│       ├── image_processor.py      # Importação e resize de imagens
│       ├── annotation_manager.py   # Gerenciamento de anotações (JSON)
│       └── dataset_exporter.py     # Conversão para formato YOLO
│
├── frontend/
│   ├── index.html                  # Dashboard (criar/listar projetos)
│   ├── annotator.html              # Interface de anotação
│   ├── css/
│   │   └── style.css               # Tema escuro completo
│   └── js/
│       ├── api.js                  # Chamadas HTTP ao backend
│       ├── app.js                  # Estado global e orquestração
│       ├── canvas.js               # Canvas de anotação (desenho, resize, drag)
│       ├── sidebar.js              # Classes, estatísticas, exportação
│       ├── timeline.js             # Timeline de frames com multi-seleção
│       └── shortcuts.js            # Atalhos de teclado
│
├── data/                           # Dados dos projetos (auto-criado)
│   └── {projeto}/
│       ├── frames/                 # Imagens/frames extraídos
│       ├── thumbnails/             # Miniaturas para timeline
│       └── annotations/            # Anotações em JSON
│
└── exports/                        # Datasets exportados (auto-criado)
    └── {projeto}/
        ├── data.yaml               # Config do dataset YOLO
        ├── train/
        │   ├── images/
        │   └── labels/
        ├── val/
        │   ├── images/
        │   └── labels/
        └── test/
            ├── images/
            └── labels/
```

---

## 🛠️ Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| **Python** | 3.11+ | Linguagem principal do backend |
| **FastAPI** | 0.115 | Framework web assíncrono (API REST) |
| **Uvicorn** | 0.30 | Servidor ASGI |
| **OpenCV** | 4.10 (headless) | Extração de frames de vídeos |
| **Pillow** | 10.4 | Processamento de imagens e thumbnails |
| **PyYAML** | 6.0 | Geração do `data.yaml` para YOLO |
| **HTML5 Canvas** | — | Renderização de anotações no browser |
| **Vanilla JS** | ES6+ | Frontend modular sem frameworks |

---

## 🚀 Como Rodar

### Pré-requisitos

- **Python 3.11+** instalado (recomendado via [pyenv](https://github.com/pyenv/pyenv))
- **pip** (gerenciador de pacotes Python)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/yolo-dataset-builder.git
cd yolo-dataset-builder

# 2. (Opcional) Crie um ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 3. Instale as dependências
pip install -r requirements.txt
```

### Executando

```bash
python run.py
```

O servidor inicia em **http://localhost:8000** — abra no navegador.

### Gerenciamento do Servidor

```bash
# Parar o servidor
fuser -k 8000/tcp

# Reiniciar
fuser -k 8000/tcp; sleep 1; python run.py
```

---

## 📖 Como Usar

### 1. Criar um Projeto

Na tela inicial, insira o **nome do projeto** e as **classes** de detecção (ex: `pessoa_caida`, `pessoa_em_pe`). Clique em **Criar Projeto**.

### 2. Upload de Mídia

No anotador, clique em **📁 Upload** ou arraste arquivos para a tela:
- **Imagens**: são importadas diretamente como frames
- **Vídeos**: abre um modal para configurar o intervalo de extração de frames (ex: 1 frame a cada 30 = ~1 fps para vídeo de 30fps)

### 3. Anotar Frames

1. Selecione a **classe** desejada na sidebar (ou tecle `1-9`)
2. Desenhe uma **bounding box** ao redor do objeto no canvas
3. Use os **handles** para ajustar tamanho e posição
4. Navegue entre frames com `D`/`A` ou `→`/`←` (salva automaticamente)
5. Marque frames ruins com `X` (skip)

### 4. Multi-Seleção e Ações em Lote

Na timeline (parte inferior):
- **Ctrl+Click** — seleciona/desseleciona frames individualmente
- **Shift+Click** — seleciona um range de frames
- Use os botões **Excluir selecionados** ou **Pular selecionados** na barra de ações

### 5. Exportar Dataset

Na sidebar, configure o split **Train/Val/Test** (padrão: 80/15/5) e opcionalmente o **resize** das imagens. Clique em **Exportar YOLO**.

> ⚠️ **Apenas frames com anotações salvas são exportados.** Frames sem bbox ou marcados como "pulados" são ignorados.

O dataset é gerado em `exports/{projeto}/` com a estrutura padrão YOLO, pronto para uso com:

```python
from ultralytics import YOLO

model = YOLO("yolo11n.pt")
model.train(data="exports/meu_projeto/data.yaml", epochs=100, imgsz=640)
```

### Formato YOLO dos Labels

Cada arquivo `.txt` de label contém uma linha por objeto:

```
class_id x_center y_center width height
```

Todos os valores são **normalizados entre 0 e 1** em relação às dimensões da imagem.

---

## 📂 Formato do `data.yaml`

```yaml
path: /caminho/absoluto/exports/meu_projeto
train: train/images
val: val/images
test: test/images
names:
  0: pessoa_caida
  1: pessoa_em_pe
```

---

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/minha-feature`)
3. Commit suas mudanças (`git commit -m 'feat: minha feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

<table>
  <tr>
    <td align="center">
      <strong>Leonardo de Souza Melo</strong><br>
      <a href="mailto:souzaleonardomelo1@gmail.com">souzaleonardomelo1@gmail.com</a><br>
      <a href="https://github.com/dwSize-PE">GitHub</a>
    </td>
  </tr>
</table>

<p align="center">
  Desenvolvido com ☕ e Python por <strong>Leonardo de Souza Melo</strong> — <a href="https://camerite.com">Camerite</a>
</p>
