#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import { ReceiptScannerStack } from "../lib/receiptScannerStack";

const app = new cdk.App();
new ReceiptScannerStack(app, "ReceiptScannerStack");
