export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { trace } = await import('@opentelemetry/api')
    const { Resource } = await import('@opentelemetry/resources')
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node')
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions')
    const { SimpleSpanProcessor } = await import('@opentelemetry/sdk-trace-base')
    const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-base')

    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'cashora',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }),
    })

    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
    provider.register()

    trace.getTracer('cashora-app')
  }
} 