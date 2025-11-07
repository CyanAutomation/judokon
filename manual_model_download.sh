#!/bin/bash

set -e

TEMP_DIR="temp_model_files"
ONNX_DIR="$TEMP_DIR/onnx"

echo "Creating temporary directory..."
mkdir -p "$ONNX_DIR"

echo "Downloading model files..."
curl -L https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json -o "$TEMP_DIR/config.json"
curl -L https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json -o "$TEMP_DIR/tokenizer.json"
curl -L https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json -o "$TEMP_DIR/tokenizer_config.json"
curl -L https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx -o "$ONNX_DIR/model_quantized.onnx"

echo "Preparing local model from downloaded files..."
npm run rag:prepare:models -- --from-dir "$TEMP_DIR"

echo "Cleaning up temporary directory..."
rm -rf "$TEMP_DIR"

echo "Local model prepared successfully!"
