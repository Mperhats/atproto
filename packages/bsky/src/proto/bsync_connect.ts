// @generated by protoc-gen-connect-es v1.4.0 with parameter "target=ts,import_extension="
// @generated from file bsync.proto (package bsync, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import {
  AddMuteOperationRequest,
  AddMuteOperationResponse,
  PingRequest,
  PingResponse,
  ScanMuteOperationsRequest,
  ScanMuteOperationsResponse,
} from './bsync_pb'
import { MethodKind } from '@bufbuild/protobuf'

/**
 * @generated from service bsync.Service
 */
export const Service = {
  typeName: 'bsync.Service',
  methods: {
    /**
     * Sync
     *
     * @generated from rpc bsync.Service.AddMuteOperation
     */
    addMuteOperation: {
      name: 'AddMuteOperation',
      I: AddMuteOperationRequest,
      O: AddMuteOperationResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc bsync.Service.ScanMuteOperations
     */
    scanMuteOperations: {
      name: 'ScanMuteOperations',
      I: ScanMuteOperationsRequest,
      O: ScanMuteOperationsResponse,
      kind: MethodKind.Unary,
    },
    /**
     * Ping
     *
     * @generated from rpc bsync.Service.Ping
     */
    ping: {
      name: 'Ping',
      I: PingRequest,
      O: PingResponse,
      kind: MethodKind.Unary,
    },
  },
} as const
