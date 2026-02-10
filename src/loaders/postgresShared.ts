import { Client } from 'pg';
import config from '../../config';
import Logger from './logger';
import path from 'path';
import fs from 'fs';

const useSSL = process.env.NODE_ENV === 'production';

let sslConfig: any = false;

if (process.env.NODE_ENV !== 'production') {
  if(process.env.NODE_ENV !== 'test'){
    sslConfig = {rejectUnauthorized: false}
  }else{
    sslConfig = false
  }
} else {
  sslConfig = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(
      path.resolve(__dirname, '../../certs/shared.pem')
    ).toString(),
  };
}

console.log(sslConfig);

const clientShared = new Client({
  host: config.auroraHostShared,
  port: Number.parseInt(config.auroraPortShared, 10) || 5432,
  user: config.auroraUserShared,
  password: config.auroraPasswordShared,
  database: config.auroraDatabaseShared,

  ssl: sslConfig,
});

export { clientShared };
