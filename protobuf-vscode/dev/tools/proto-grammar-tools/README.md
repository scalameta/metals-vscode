## Protobuf grammar helper scripts (uv)

These scripts are for quickly sanity-checking regexes used in `protobuf/syntaxes/proto3.json`.

### Setup

From repo root:

```bash
uv sync --project protobuf/dev/tools/proto-grammar-tools
```

### Example: check which lines match `rpcDeclaration`

```bash
uv run --project protobuf/dev/tools/proto-grammar-tools python protobuf/dev/tools/proto-grammar-tools/debug_matches.py \
  --grammar protobuf/syntaxes/proto3.json \
  --file protobuf/dev/test/grammar/clean.test.proto \
  --repo-key rpcDeclaration
```

