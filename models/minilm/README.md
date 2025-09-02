Placeholder for quantized MiniLM-L6-v2 model files.
Actual model weights are omitted in this environment.

## Download

For offline embedding generation, place the quantized **all-MiniLM-L6-v2** files here:

```bash
mkdir -p models/minilm/onnx
wget https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json -O models/minilm/config.json
wget https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json -O models/minilm/tokenizer.json
wget https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json -O models/minilm/tokenizer_config.json
wget https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx -O models/minilm/onnx/model_quantized.onnx
```

After downloading, `scripts/generateEmbeddings.js` will use these files instead of fetching the model online.
