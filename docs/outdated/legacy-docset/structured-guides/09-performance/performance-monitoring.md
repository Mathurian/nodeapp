# Performance Monitoring

## Overview


Performance monitoring and metrics.

## Metrics Collection
Using Prometheus client (`prom-client`)

## Metrics Endpoint
GET /metrics (Prometheus format)

## Collected Metrics
- HTTP request duration
- Request count by endpoint
- Error rate
- Active connections
- Database query duration
- Cache hit/miss rate

## Grafana Dashboards
Import dashboards from `/var/www/event-manager/grafana/`

## Alerting
Configure alerts for:
- High error rate (>5%)
- Slow response time (>1s p95)
- High memory usage (>80%)
- Database connection pool exhaustion

## APM Integration
Compatible with:
- Prometheus + Grafana
- New Relic
- DataDog
- Application Insights

## Log Analysis
Winston logs to `logs/combined.log`

Use log aggregation tools:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Loki

See `/var/www/event-manager/docker-compose.monitoring.yml`


## Related Documentation

- [System Architecture Overview](../01-architecture/overview.md)
- [Documentation Index](../INDEX.md)

---

*This document is part of the Event Manager documentation suite.*
*Last updated: 2025-11-14*
