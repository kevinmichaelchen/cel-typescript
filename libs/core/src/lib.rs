#![deny(clippy::all)]

use cel_interpreter::{Context, Program, Value};
use napi_derive::napi;
use serde_json::Value as JsonValue;
use std::sync::Arc;

#[napi]
pub struct CelProgram {
    program: Program,
}

#[napi]
impl CelProgram {
    #[napi(constructor)]
    pub fn new() -> Self {
        panic!("Use CelProgram::compile to create a new instance");
    }

    #[napi]
    pub fn compile(source: String) -> napi::Result<CelProgram> {
        let program =
            Program::compile(&source).map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(CelProgram { program })
    }

    fn json_to_cel_value(value: &JsonValue) -> Value {
        match value {
            JsonValue::Null => Value::Null,
            JsonValue::Bool(b) => Value::Bool(*b),
            JsonValue::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Value::Int(i)
                } else if let Some(u) = n.as_u64() {
                    Value::UInt(u)
                } else if let Some(f) = n.as_f64() {
                    Value::Float(f)
                } else {
                    Value::Null
                }
            }
            JsonValue::String(s) => Value::String(Arc::new(s.clone())),
            JsonValue::Array(arr) => {
                let values: Vec<Value> = arr.iter().map(|v| Self::json_to_cel_value(v)).collect();
                Value::List(Arc::new(values))
            }
            JsonValue::Object(map) => {
                let mut cel_map = std::collections::HashMap::new();
                for (key, value) in map {
                    cel_map.insert(key.clone(), Self::json_to_cel_value(value));
                }
                Value::Map(cel_map.into())
            }
        }
    }

    fn cel_to_json_value(value: Value) -> JsonValue {
        match value {
            Value::Null => JsonValue::Null,
            Value::Bool(b) => JsonValue::Bool(b),
            Value::Int(i) => JsonValue::Number(i.into()),
            Value::UInt(u) => JsonValue::Number(u.into()),
            Value::Float(f) => serde_json::Number::from_f64(f)
                .map(JsonValue::Number)
                .unwrap_or(JsonValue::Null),
            Value::String(s) => JsonValue::String((*s).to_string()),
            Value::List(list) => JsonValue::Array(
                list.iter()
                    .map(|v| Self::cel_to_json_value(v.clone()))
                    .collect(),
            ),
            Value::Map(map) => JsonValue::Object(
                map.map
                    .iter()
                    .map(|(k, v)| (k.to_string(), Self::cel_to_json_value(v.clone())))
                    .collect(),
            ),
            Value::Timestamp(ts) => JsonValue::String(ts.to_rfc3339()),
            Value::Duration(dur) => {
                JsonValue::Number(serde_json::Number::from(dur.num_nanoseconds().unwrap_or(0)))
            }
            _ => JsonValue::Null,
        }
    }

    #[napi]
    pub fn execute(&self, context: JsonValue) -> napi::Result<JsonValue> {
        let mut ctx = Context::default();

        if let JsonValue::Object(map) = context {
            for (key, value) in map {
                let cel_value = Self::json_to_cel_value(&value);
                ctx.add_variable_from_value(key, cel_value);
            }
        }

        self.program
            .execute(&ctx)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
            .map(Self::cel_to_json_value)
    }
}
