import { Agent } from '../agent/Agent';
import { OutboundPackage } from '../types';

export interface OutboundTransporter {
  start(agent: Agent): Promise<void>;
  sendMessage(outboundPackage: OutboundPackage, receiveReply: boolean): Promise<any>;
  sendAndReceiveMessage(outboundPackage: OutboundPackage): Promise<any>;
}
