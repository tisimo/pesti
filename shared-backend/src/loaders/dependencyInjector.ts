import { Container } from "typedi";
import LoggerInstance from "./logger";

export default ({ schemas, controllers, repos, services}: {
  schemas: { name: string; schema: any }[],
  controllers: {name: string; path: string }[],
  repos: {name: string; path: string }[],
  services: {name: string; path: string }[] 
}) => {
  try {
    Container.set('logger', LoggerInstance);

    schemas.forEach(m => {
      let schema = require(m.schema).default;
      Container.set(m.name, schema);
    });
  
    repos.forEach(m => {
      let repoClass = require(m.path).default;
      let repoInstance = Container.get(repoClass);
      Container.set(m.name, repoInstance);
    });

    services.forEach(m => {
      let serviceClass = require(m.path).default;
      let serviceInstance = Container.get(serviceClass)
      Container.set(m.name, serviceInstance);
    });

    controllers.forEach(m => {
      let controllerClass = require(m.path).default;
      let controllerInstance = Container.get(controllerClass);
      Container.set(m.name, controllerInstance);
    });

    // 🔥 AWS SERVICES - Registrar APÓS os outros serviços estarem prontos
    try {
      LoggerInstance.info("AWS Services registered successfully");
    } catch (awsError) {
      LoggerInstance.warn("AWS Services failed to initialize (check .env): %o", awsError);
    }

    return;
  } catch (e) {
    LoggerInstance.error("Error on dependency injector loader: %o", e);
    throw e;
  }
};
