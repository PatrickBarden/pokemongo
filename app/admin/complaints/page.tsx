'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Shield,
    Search,
    Eye,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    User,
    Package,
    ShoppingCart,
    ExternalLink,
    Loader2,
    RefreshCw,
    Filter,
    MessageSquare,
    Ban
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ComplaintStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

interface Complaint {
    id: string;
    reporter_id: string;
    reported_user_id: string | null;
    listing_id: string | null;
    order_id: string | null;
    type: string;
    reason: string;
    description: string;
    evidence_urls: string[] | null;
    status: ComplaintStatus;
    admin_notes: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
    reporter?: { display_name: string; email: string };
    reported_user?: { display_name: string; email: string };
}

const statusConfig: Record<ComplaintStatus, { label: string; color: string; icon: any }> = {
    pending: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
    investigating: { label: 'Investigando', color: 'bg-blue-500', icon: Search },
    resolved: { label: 'Resolvido', color: 'bg-green-500', icon: CheckCircle2 },
    dismissed: { label: 'Arquivado', color: 'bg-gray-500', icon: XCircle },
};

const reasonLabels: Record<string, string> = {
    fraud: 'Fraude',
    inappropriate_content: 'Conteúdo Inadequado',
    spam: 'Spam',
    harassment: 'Assédio',
    fake_pokemon: 'Pokémon Falso',
    non_delivery: 'Não Entrega',
    scam: 'Golpe',
    other: 'Outro',
};

const typeLabels: Record<string, { label: string; icon: any }> = {
    user: { label: 'Usuário', icon: User },
    listing: { label: 'Anúncio', icon: Package },
    order: { label: 'Pedido', icon: ShoppingCart },
    other: { label: 'Outro', icon: AlertTriangle },
};

export default function AdminComplaintsPage() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadComplaints();
    }, []);

    const loadComplaints = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('complaints')
                .select(`
          *,
          reporter:reporter_id(display_name, email),
          reported_user:reported_user_id(display_name, email)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComplaints((data as any) || []);
        } catch (error) {
            console.error('Erro ao carregar denúncias:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: ComplaintStatus) => {
        setUpdating(true);
        try {
            const updateData: any = {
                status: newStatus,
                admin_notes: adminNotes || null,
            };

            if (newStatus === 'resolved' || newStatus === 'dismissed') {
                updateData.resolved_at = new Date().toISOString();
                // resolved_by seria o admin atual
            }

            const { error } = await supabase
                .from('complaints')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Atualizar estado local
            setComplaints(prev =>
                prev.map(c => c.id === id ? { ...c, ...updateData } : c)
            );
            setModalOpen(false);
            setSelectedComplaint(null);
            setAdminNotes('');
        } catch (error) {
            console.error('Erro ao atualizar denúncia:', error);
        } finally {
            setUpdating(false);
        }
    };

    const filteredComplaints = complaints.filter(c => {
        if (filterStatus !== 'all' && c.status !== filterStatus) return false;
        if (filterType !== 'all' && c.type !== filterType) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                c.description.toLowerCase().includes(query) ||
                c.reporter?.display_name?.toLowerCase().includes(query) ||
                c.reported_user?.display_name?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === 'pending').length,
        investigating: complaints.filter(c => c.status === 'investigating').length,
        resolved: complaints.filter(c => c.status === 'resolved').length,
    };

    const openDetail = (complaint: Complaint) => {
        setSelectedComplaint(complaint);
        setAdminNotes(complaint.admin_notes || '');
        setModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="h-8 w-8 text-red-500" />
                        Denúncias
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie denúncias dos usuários
                    </p>
                </div>
                <Button onClick={loadComplaints} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <Shield className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-yellow-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-yellow-600">Pendentes</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600">Investigando</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.investigating}</p>
                            </div>
                            <Search className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-green-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600">Resolvidos</p>
                                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por descrição ou usuário..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos Status</SelectItem>
                                <SelectItem value="pending">Pendentes</SelectItem>
                                <SelectItem value="investigating">Investigando</SelectItem>
                                <SelectItem value="resolved">Resolvidos</SelectItem>
                                <SelectItem value="dismissed">Arquivados</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos Tipos</SelectItem>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="listing">Anúncio</SelectItem>
                                <SelectItem value="order">Pedido</SelectItem>
                                <SelectItem value="other">Outro</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Denunciante</TableHead>
                                <TableHead>Denunciado</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredComplaints.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">
                                        <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                                        <p className="text-muted-foreground">Nenhuma denúncia encontrada</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredComplaints.map((complaint) => {
                                    const status = statusConfig[complaint.status];
                                    const TypeIcon = typeLabels[complaint.type]?.icon || AlertTriangle;

                                    return (
                                        <TableRow key={complaint.id}>
                                            <TableCell>
                                                <Badge className={`${status.color} text-white border-0`}>
                                                    <status.icon className="h-3 w-3 mr-1" />
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                                    {typeLabels[complaint.type]?.label || complaint.type}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{reasonLabels[complaint.reason] || complaint.reason}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-medium">
                                                    {complaint.reporter?.display_name || 'N/A'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">
                                                    {complaint.reported_user?.display_name || '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {format(new Date(complaint.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDetail(complaint)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Ver
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal de Detalhes */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-red-500" />
                            Detalhes da Denúncia
                        </DialogTitle>
                        <DialogDescription>
                            ID: {selectedComplaint?.id?.slice(0, 8)}...
                        </DialogDescription>
                    </DialogHeader>

                    {selectedComplaint && (
                        <div className="space-y-4">
                            {/* Status atual */}
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <span className="text-sm font-medium">Status Atual</span>
                                <Badge className={`${statusConfig[selectedComplaint.status].color} text-white border-0`}>
                                    {statusConfig[selectedComplaint.status].label}
                                </Badge>
                            </div>

                            {/* Informações */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Tipo</p>
                                    <p className="font-medium">{typeLabels[selectedComplaint.type]?.label}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Motivo</p>
                                    <p className="font-medium">{reasonLabels[selectedComplaint.reason]}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Denunciante</p>
                                    <p className="font-medium">{selectedComplaint.reporter?.display_name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedComplaint.reporter?.email}</p>
                                </div>
                                {selectedComplaint.reported_user && (
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Denunciado</p>
                                        <p className="font-medium">{selectedComplaint.reported_user?.display_name}</p>
                                        <p className="text-xs text-muted-foreground">{selectedComplaint.reported_user?.email}</p>
                                    </div>
                                )}
                            </div>

                            {/* Descrição */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Descrição</p>
                                <div className="p-3 bg-muted rounded-lg text-sm">
                                    {selectedComplaint.description}
                                </div>
                            </div>

                            {/* Evidências */}
                            {selectedComplaint.evidence_urls && selectedComplaint.evidence_urls.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Evidências</p>
                                    <div className="space-y-1">
                                        {selectedComplaint.evidence_urls.map((url, i) => (
                                            <a
                                                key={i}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-poke-blue hover:underline"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                Evidência {i + 1}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notas Admin */}
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Notas do Admin</p>
                                <Textarea
                                    placeholder="Adicione notas internas sobre esta denúncia..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            {/* Ações */}
                            <div className="flex flex-wrap gap-2 pt-4 border-t">
                                {selectedComplaint.status === 'pending' && (
                                    <Button
                                        onClick={() => updateStatus(selectedComplaint.id, 'investigating')}
                                        disabled={updating}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Search className="h-4 w-4 mr-2" />
                                        Iniciar Investigação
                                    </Button>
                                )}
                                {(selectedComplaint.status === 'pending' || selectedComplaint.status === 'investigating') && (
                                    <>
                                        <Button
                                            onClick={() => updateStatus(selectedComplaint.id, 'resolved')}
                                            disabled={updating}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Marcar Resolvido
                                        </Button>
                                        <Button
                                            onClick={() => updateStatus(selectedComplaint.id, 'dismissed')}
                                            disabled={updating}
                                            variant="outline"
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Arquivar
                                        </Button>
                                    </>
                                )}
                                {selectedComplaint.reported_user_id && (
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            // Aqui poderia banir o usuário
                                            alert('Função de banir será implementada via admin-actions');
                                        }}
                                    >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Banir Usuário
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
