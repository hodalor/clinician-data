import { Alert, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getQcReviewSession } from '../../api/qc-api';
import { QcReabstractionForm } from './qc-reabstraction-form';

export function QcReabstractionPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ['qc-session', recordId],
    queryFn: () => getQcReviewSession(recordId!),
    enabled: Boolean(recordId),
  });

  if (sessionQuery.isLoading) {
    return <Text c="dimmed">Loading QC form...</Text>;
  }

  if (sessionQuery.error) {
    return (
      <Alert color="red" title="Could not open QC form">
        {sessionQuery.error.message}
      </Alert>
    );
  }

  if (sessionQuery.data?.reabstraction_submitted) {
    return (
      <Stack gap="md">
        <Alert color="yellow" title="Re-abstraction already submitted">
          This record already has a QC entry. Open the comparison to review it.
        </Alert>
        <Group>
          <Button component={Link} to={`/qc/${recordId}`} color="yellow">
            Open comparison
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group>
        <Button component={Link} to="/qc" variant="default">
          Back to QC queue
        </Button>
        <Button component={Link} to={`/qc/${recordId}`} variant="outline">
          Open comparison
        </Button>
      </Group>
      <Alert color="yellow" title="QC review not yet started">
        This form is blank. The original abstraction stays hidden until you submit.
      </Alert>
      <Paper withBorder radius="md" p="lg">
        <QcReabstractionForm
          recordId={recordId!}
          onSubmitted={async () => {
            await queryClient.invalidateQueries({ queryKey: ['qc-session', recordId] });
            navigate(`/qc/${recordId}`);
          }}
        />
      </Paper>
    </Stack>
  );
}
