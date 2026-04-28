import { useQuery, useMutation, UseQueryResult, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { customFetch, ErrorType } from './custom-fetch';

export interface StoreGroup {
  id: number;
  name: string;
  createdAt: string;
}

export interface CreateStoreGroupRequest {
  name: string;
}

export interface UpdateStoreGroupRequest {
  name: string;
}

export const getStoreGroupsUrl = () => `/api/store-groups`;

export const getStoreGroups = async (options?: RequestInit): Promise<StoreGroup[]> => {
  return customFetch<StoreGroup[]>(getStoreGroupsUrl(), {
    ...options,
    method: 'GET'
  });
};

export const useGetStoreGroups = (): UseQueryResult<StoreGroup[], ErrorType<unknown>> => {
  return useQuery({
    queryKey: [getStoreGroupsUrl()],
    queryFn: () => getStoreGroups()
  });
};

export const createStoreGroup = async (data: CreateStoreGroupRequest, options?: RequestInit): Promise<StoreGroup> => {
  return customFetch<StoreGroup>(getStoreGroupsUrl(), {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(data)
  });
};

export const useCreateStoreGroup = (): UseMutationResult<StoreGroup, ErrorType<unknown>, { data: CreateStoreGroupRequest }> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data }) => createStoreGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getStoreGroupsUrl()] });
    }
  });
};

export const updateStoreGroup = async (id: number, data: UpdateStoreGroupRequest, options?: RequestInit): Promise<StoreGroup> => {
  return customFetch<StoreGroup>(`${getStoreGroupsUrl()}/${id}`, {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(data)
  });
};

export const useUpdateStoreGroup = (): UseMutationResult<StoreGroup, ErrorType<unknown>, { id: number, data: UpdateStoreGroupRequest }> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateStoreGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getStoreGroupsUrl()] });
    }
  });
};

export const deleteStoreGroup = async (id: number, options?: RequestInit): Promise<{message: string}> => {
  return customFetch<{message: string}>(`${getStoreGroupsUrl()}/${id}`, {
    ...options,
    method: 'DELETE'
  });
};

export const useDeleteStoreGroup = (): UseMutationResult<{message: string}, ErrorType<unknown>, { id: number }> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deleteStoreGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getStoreGroupsUrl()] });
    }
  });
};
