
// remove by JRT : import uuid from 'uuid/v4';
const { randomUUID } = require('crypto');
import { Identifier } from './Identifier'

export class UniqueEntityID extends Identifier<string | number>{
  constructor (id?: string | number) {
    super(id ? id : randomUUID())
  }
}