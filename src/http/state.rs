use std::sync::Arc;

use metrics_exporter_prometheus::PrometheusHandle;
use metrics_process::Collector;

use crate::{config::Config, db::GreetingsRepository};

#[derive(Debug, Clone)]
pub struct AppState {
    pub prometheus_handle: PrometheusHandle,
    pub sys_collector: Collector,
    pub greetings_repo: Arc<GreetingsRepository>,
}

impl AppState {
    pub fn new(
        _config: &Config,
        prometheus_handle: PrometheusHandle,
        sys_collector: Collector,
        greetings_repo: Arc<GreetingsRepository>,
    ) -> Self {
        Self {
            prometheus_handle,
            sys_collector,
            greetings_repo,
        }
    }
}
