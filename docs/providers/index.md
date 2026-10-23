---
summary: "Model providers (LLMs) supported by this OpenClaw build"
read_when:
  - You need a quick overview of supported LLM backends
title: "Provider Directory"
---

# Model Providers

This fork supports **local providers only** — models are intended to run
on-premise. Cloud API credentials for hosted model vendors are not part of
this policy. For the full multi-provider story in **upstream** OpenClaw, see
the [official project](https://github.com/openclaw/openclaw) and
[Model providers](/concepts/model-providers) (reference; not all options apply
in this build).

## Quick start (local)

1. Start your local stack (Ollama, LM Studio, vLLM, etc.).
2. Set the default model, e.g. `ollama/<local-model-name>` or your LiteLLM route.

```json5
{
  agents: { defaults: { model: { primary: "ollama/<local-model-name>" } } },
}
```

## Provider docs in this build

- [Ollama](/providers/ollama)
- [LM Studio](/providers/lmstudio)
- [ComfyUI](/providers/comfy)
- [vLLM](/providers/vllm)
- [SGLang](/providers/sglang)
- [NVIDIA NIM (RTX)](/providers/nvidia)
- [LiteLLM (unified gateway)](/providers/litellm)
- [Synthetic (tests)](/providers/synthetic)

Shared naming and catalog notes: [Model catalog](/providers/models)

## Related

- [Image generation](/tools/image-generation)
- [Music generation](/tools/music-generation)
- [Video generation](/tools/video-generation)
