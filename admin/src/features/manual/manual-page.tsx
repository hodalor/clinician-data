import {
  Accordion,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';

const roleCards = [
  {
    title: 'Research assistant',
    whereToStart: 'Mobile app home screen',
    steps: [
      'Open the mobile app and sign in.',
      'On Home, check your Assigned, Completed, Pending Sync, and Returned by QC numbers.',
      'Tap + New abstraction to start a new record when an active assignment is available.',
      'Use Drafts, Pending Outcome, Pending Sync, Sync Failed, or Returned by QC to reopen the right queue in one tap.',
      'Tap Sync now when you want to send saved records to the server.',
      'Open Sync status to see whether each record is Pending Sync, Synced, Failed, or Needs Review.',
    ],
  },
  {
    title: 'QC reviewer',
    whereToStart: 'Mobile QC Queue or Admin QC page',
    steps: [
      'Open QC Queue to see records waiting for blind re-abstraction.',
      'Tap a record and complete the QC entry without copying the RA entry.',
      'After submit, review the comparison screen and read the mismatched rows.',
      'Choose Approve, Correct, Return to RA, or Verify and lock.',
      'Use Duplicates when you need to review possible duplicate records.',
    ],
  },
  {
    title: 'PI or study lead',
    whereToStart: 'Admin dashboard',
    steps: [
      'Open Dashboard for the quick study overview and by-RA progress table.',
      'Open Assignments to create or update work batches for RAs.',
      'Open Records to review screened records and read audit history.',
      'Open QC and Duplicates to monitor review work.',
      'Open Missingness to see where source data is incomplete.',
      'Open Export when you need a spreadsheet for approved research work.',
    ],
  },
  {
    title: 'Admin or superadmin',
    whereToStart: 'Admin Users and Devices',
    steps: [
      'Open Users to create, edit, or disable study accounts.',
      'Open Devices to deactivate lost devices or authorise replacements.',
      'Use Assignments, Records, Missingness, and Audit to support the study team.',
      'Use Manual any time you need a plain-language reminder of where tasks live.',
    ],
  },
];

const adminSteps = [
  {
    title: 'Dashboard',
    body:
      'Start here for the big picture. It shows study totals and progress by research assistant.',
  },
  {
    title: 'Assignments',
    body:
      'Use this to create work batches, choose the RA, set the date range, and review records under each assignment.',
  },
  {
    title: 'Records',
    body:
      'Use this to find a specific record, review details, and read the audit history in plain order.',
  },
  {
    title: 'QC and Duplicates',
    body:
      'Use these pages to compare RA and QC entries, resolve disagreements, and review duplicate flags.',
  },
  {
    title: 'Missingness',
    body:
      'Use this page to see which assistants or dates have more missing fields.',
  },
  {
    title: 'Export',
    body:
      'Choose your filters once, then pick the spreadsheet you need. Each export opens as a table in Excel.',
  },
  {
    title: 'Users and Devices',
    body:
      'Use these pages for account setup, role changes, lost devices, and replacement devices.',
  },
];

const mobileSteps = [
  {
    title: 'RA home',
    body:
      'This is the daily working screen. The queues and summary numbers help staff know what to do next right away.',
  },
  {
    title: 'New abstraction',
    body:
      'Tap + New abstraction, move one section at a time, use Next and Back, and finish on Review & Save.',
  },
  {
    title: 'Returned by QC',
    body:
      'Open the Returned by QC queue, read the comment, make the correction, and save again.',
  },
  {
    title: 'Sync status',
    body:
      'Use Sync status to understand whether a record has been sent, failed, or needs manual review.',
  },
  {
    title: 'QC on mobile',
    body:
      'QC reviewers use the same wizard, but they enter a fresh review first and only compare after they submit.',
  },
];

export function ManualPage() {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Manual</Title>
        <Text c="dimmed">
          A plain-language guide for where to go, what each page is for, and the
          next step to take.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {roleCards.map((card) => (
          <Card key={card.title} withBorder radius="md" padding="lg">
            <Stack gap="sm">
              <Group gap="sm" align="flex-start">
                <ThemeIcon size="lg" radius="xl" color="dark">
                  {card.title.charAt(0)}
                </ThemeIcon>
                <div>
                  <Text fw={700}>{card.title}</Text>
                  <Text size="sm" c="dimmed">
                    Start here: {card.whereToStart}
                  </Text>
                </div>
              </Group>
              {card.steps.map((step, index) => (
                <Text key={step} size="sm">
                  {index + 1}. {step}
                </Text>
              ))}
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      <Paper withBorder radius="md" p="lg">
        <Accordion variant="separated" radius="md">
          <Accordion.Item value="admin-pages">
            <Accordion.Control>Admin pages: where to find each task</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                {adminSteps.map((item, index) => (
                  <div key={item.title}>
                    <Text fw={600}>
                      {index + 1}. {item.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {item.body}
                    </Text>
                  </div>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="mobile-pages">
            <Accordion.Control>Mobile app: where to tap next</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="sm">
                {mobileSteps.map((item, index) => (
                  <div key={item.title}>
                    <Text fw={600}>
                      {index + 1}. {item.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {item.body}
                    </Text>
                  </div>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>

          <Accordion.Item value="simple-rules">
            <Accordion.Control>Simple working rules for the team</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">1. Start from the queue, not from memory.</Text>
                <Text size="sm">
                  2. Use Review &amp; Save before leaving a record.
                </Text>
                <Text size="sm">
                  3. Use Sync status when a record is missing from the server.
                </Text>
                <Text size="sm">
                  4. Use Export only for approved study work.
                </Text>
                <Text size="sm">
                  5. If something looks wrong, check Manual first, then Audit or
                  Records.
                </Text>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Paper>
    </Stack>
  );
}
