pub mod metrics;

use crate::db;
use std::{sync::Arc, time::SystemTime};
use tonic::{Code, Request, Response, Result, Status};

tonic::include_proto!("helloworld");
pub const FILE_DESCRIPTOR_SET: &[u8] = tonic::include_file_descriptor_set!("helloworld_descriptor");

// main will need this
pub use greeter_service_server::GreeterServiceServer;

#[derive(Debug, Default)]
pub struct GreeterService {
    greetings_repo: Arc<db::GreetingsRepository>,
}

impl GreeterService {
    pub fn new(greetings_repo: Arc<db::GreetingsRepository>) -> Self {
        Self { greetings_repo }
    }
}

#[tonic::async_trait]
impl greeter_service_server::GreeterService for GreeterService {
    async fn echo_hello(
        &self,
        request: Request<EchoHelloRequest>,
    ) -> Result<Response<EchoHelloResponse>, Status> {
        let request = request.into_inner();
        let name = request.name;

        if name.is_empty() {
            return Err(Status::new(
                Code::InvalidArgument,
                "please pass in a non-empty string for name",
            ));
        }

        Ok(EchoHelloResponse {
            response: format!("hello {name}"),
        }
        .into())
    }

    async fn say_greeting(
        &self,
        request: Request<SayGreetingRequest>,
    ) -> Result<Response<SayGreetingResponse>, Status> {
        let request = request.into_inner();
        let recipient_name = request.recipient_name;
        let sender_name = request.sender_name;
        let message = request.greeting;

        self.greetings_repo
            .clone()
            .add_new_greeting(
                &recipient_name,
                db::NewGreeting {
                    recipient_name: recipient_name.clone(),
                    sender_name,
                    message,
                },
            )
            .await;

        Ok(SayGreetingResponse {}.into())
    }

    async fn get_greetings_by_name(
        &self,
        request: Request<GetGreetingsByNameRequest>,
    ) -> Result<Response<GreetingsResponse>, Status> {
        let request = request.into_inner();

        match request.recipient_name.as_deref() {
            Some("") | None => {
                let greetings = self.greetings_repo.get_all_greetings().await;

                Ok(GreetingsResponse {
                    replies: greetings
                        .into_iter()
                        .map(|g| {
                            let std_time: SystemTime = g.timestamp.into();

                            GreetingResponse {
                                id: g.id,
                                message: format!("{} says {}", g.sender_name, g.message),
                                sender_name: g.sender_name,
                                recipient_name: g.recipient_name,
                                received_at: Some(std_time.into()),
                            }
                        })
                        .collect(),
                }
                .into())
            }
            Some(n) => match self.greetings_repo.get_greetings_by_name(n).await {
                Some(greetings) => Ok(GreetingsResponse {
                    replies: greetings
                        .iter()
                        .map(|g| {
                            let g = g.clone();
                            let std_time: SystemTime = g.timestamp.into();

                            GreetingResponse {
                                id: g.id,
                                message: format!("{} says {}", g.sender_name, g.message),
                                sender_name: g.sender_name,
                                recipient_name: g.recipient_name,
                                received_at: Some(std_time.into()),
                            }
                        })
                        .collect(),
                }
                .into()),
                None => Err(Status::not_found("no greetings found for this name")),
            },
        }
    }
}
