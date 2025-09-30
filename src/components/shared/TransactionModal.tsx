// Re-export the shared TransactionModal from nomyx-ts
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Space, Typography, Spin, Result } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { createTransactionModal, createExplorerLink, TransactionModalProps } from '@nomyx/shared';

// Create the component using the factory
const TransactionModal = createTransactionModal(React, {
  useState,
  useEffect,
  useMemo,
  Modal,
  Space,
  Typography,
  Spin,
  Result,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  createExplorerLink
});

// Export the props type for backward compatibility
export type { TransactionModalProps };
export default TransactionModal;